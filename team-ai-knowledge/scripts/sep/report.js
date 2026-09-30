/** `sep status | list | validate | stats | doctor` */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import {
  HOOK_SCRIPT, IDE, KB_ROOT, MCP_DIR, MCP_ENTRY, SEP_HOME, SERVER_NAME,
  isGitWorkTree, loadMcp, readJson, tryOutput,
} from './lib.js';
import { readPersonas, readSkills } from './render.js';
import { readInstallConfig } from './install.js';

const REQUIRED_PERSONAS = ['sep-skeptic', 'sep-guardian', 'sep-advocate', 'sep-codebase'];

async function workflow() {
  const mcp = await loadMcp();
  const state = await import(new URL(`file:///${path.join(MCP_DIR, 'dist', 'tools', 'localState.js').replace(/\\/g, '/')}`).href);
  const user = readInstallConfig().user;
  const sep = mcp.createSepWorkflow(new mcp.LocalProvider(KB_ROOT), {
    defaultAssignee: user,
    activeStore: state.createActiveStore(KB_ROOT),
  });
  return { mcp, sep, user };
}

export async function status(name) {
  const { sep } = await workflow();
  console.log(await sep.handleXemChange({ tenChange: name }));
}

export async function list(flags) {
  const { sep, user } = await workflow();
  const assignee = flags.all ? '*' : typeof flags.user === 'string' ? flags.user : user || '*';
  console.log(await sep.handleDanhSachChange({ assignee }));
}

// ── validate ─────────────────────────────────────────────────────────────────

/** @param flags.strict skipped steps (BLOCKED) count as errors instead of warnings */
export async function validate(flags = {}) {
  const { mcp, sep } = await workflow();
  const merge = await import(new URL(`file:///${path.join(MCP_DIR, 'dist', 'tools', 'specMerge.js').replace(/\\/g, '/')}`).href);
  const errors = [];
  const warnings = [];
  const stepOrder = mcp.SEP_STEPS.map(s => s.key);

  for (const name of await sep.listChangeNames()) {
    const info = await sep.inspectChange(name);
    const dir = path.join(KB_ROOT, mcp.CHANGES_DIR, name);
    const statusIdx = stepOrder.indexOf(info.state.status);
    const session = matter(fs.readFileSync(path.join(dir, '.session.md'), 'utf8')).data;

    if (!session.assignee) errors.push(`${name}: .session.md thiếu assignee`);
    if (session.schema && mcp.normalizeSchema(session.schema) !== session.schema) {
      errors.push(`${name}: schema "${session.schema}" không hợp lệ (${mcp.SCHEMA_KEYS.join(', ')})`);
    }
    info.steps.forEach((s, i) => {
      if (i < statusIdx && s.gap) {
        (flags.strict ? errors : warnings).push(`${name}: đang ở ${info.state.status} nhưng bước ${s.label} chưa xong (${s.gap}) — BLOCKED`);
      }
      if (i < statusIdx && !s.gap && s.approved === false) warnings.push(`${name}: bước ${s.label} xong nhưng chưa được duyệt`);
    });
    const report = path.join(dir, 'test-report.md');
    if (fs.existsSync(report) && !mcp.parseTestVerdict(fs.readFileSync(report, 'utf8'))) {
      errors.push(`${name}: test-report.md thiếu frontmatter verdict: PASS|FAIL`);
    }
    const specs = path.join(dir, 'specs.md');
    if (fs.existsSync(specs) && info.state.status !== 'archived' && !merge.parseDelta(fs.readFileSync(specs, 'utf8')).isDelta) {
      warnings.push(`${name}: specs.md chưa theo định dạng delta (## ADDED|MODIFIED|REMOVED Requirements)`);
    }
  }

  for (const key of mcp.SCHEMA_KEYS) {
    const file = path.join(KB_ROOT, mcp.SCHEMAS_DIR, key, 'schema.yaml');
    if (!fs.existsSync(file)) {
      warnings.push(`Thiếu ${path.relative(KB_ROOT, file)}`);
      continue;
    }
    const doc = matter(`---\n${fs.readFileSync(file, 'utf8')}\n---\n`).data;
    for (const step of mcp.SEP_STEPS) {
      const code = mcp.artifactsFor(step, key).filter(f => f !== '.session.md');
      const yaml = doc.required?.[step.key] ?? [];
      if (code.join(',') !== yaml.join(',')) {
        errors.push(`schema ${key}/${step.key}: schema.yaml ghi [${yaml.join(', ')}] nhưng code yêu cầu [${code.join(', ')}] (sepWorkflow.ts SCHEMAS)`);
      }
    }
  }
  if (!fs.existsSync(path.join(KB_ROOT, 'openspec', 'config.yaml'))) warnings.push('Thiếu openspec/config.yaml (bối cảnh dự án cho agent)');

  const personas = readPersonas().map(p => p.name);
  for (const p of REQUIRED_PERSONAS) if (!personas.includes(p)) errors.push(`Thiếu persona ${p} trong sep-kit/agents`);
  for (const s of readSkills()) {
    const fm = matter(s.raw).data;
    if (fm.name !== s.name) errors.push(`skill ${s.name}: frontmatter name = "${fm.name}"`);
    if (!s.description) errors.push(`skill ${s.name}: thiếu description`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.name)) errors.push(`skill ${s.name}: tên phải là chữ thường, số, gạch nối (chuẩn Agent Skills)`);
  }

  for (const w of warnings) console.log(`  ⚠️  ${w}`);
  for (const e of errors) console.log(`  ❌ ${e}`);
  console.log(errors.length ? `\n❌ ${errors.length} lỗi, ${warnings.length} cảnh báo` : `\n✅ OpenSpec + SEP kit hợp lệ (${warnings.length} cảnh báo)`);
  if (errors.length) process.exitCode = 1;
}

// ── stats ────────────────────────────────────────────────────────────────────

function countBy(items, key) {
  const m = new Map();
  for (const it of items) {
    const k = typeof key === 'function' ? key(it) : it[key];
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function table(title, rows) {
  if (!rows.length) return;
  console.log(`\n${title}`);
  const width = Math.max(...rows.map(([k]) => String(k).length));
  for (const [k, v] of rows) console.log(`  ${String(k).padEnd(width)}  ${v}`);
}

export function stats(flags) {
  const file = path.join(SEP_HOME, 'telemetry.jsonl');
  if (!fs.existsSync(file)) {
    console.log('Chưa có telemetry. Dùng /sep-* trong IDE hoặc gọi tool sep_* rồi xem lại.');
    return;
  }
  const days = Number(flags.days ?? 7);
  const since = Date.now() - days * 86_400_000;
  const events = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(e => e && Date.parse(e.ts) >= since);

  const commands = events.filter(e => e.event === 'command');
  const tools = events.filter(e => e.event === 'tool');
  const failed = tools.filter(e => e.ok === false);
  console.log(`📈 SEP telemetry ${days} ngày gần đây — ${commands.length} lệnh, ${tools.length} lần gọi tool (${failed.length} lỗi/bị chặn)`);
  table('Lệnh /sep-* (hooks):', countBy(commands, 'command'));
  table('Theo IDE:', countBy(events, 'source'));
  table('Tool sep_*:', countBy(tools, e => `${e.tool}${e.ok === false ? ' ⛔' : ''}`));
  table('Theo change:', countBy(events, 'change'));
  const avg = tools.length ? Math.round(tools.reduce((s, e) => s + (e.ms ?? 0), 0) / tools.length) : 0;
  if (tools.length) console.log(`\nThời gian xử lý tool trung bình: ${avg} ms`);
}

// ── doctor ───────────────────────────────────────────────────────────────────

async function smokeTestMcp(env) {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [MCP_ENTRY],
    env: { ...process.env, ...env, SEP_TELEMETRY: 'false' },
    stderr: 'ignore',
  });
  const client = new Client({ name: 'sep-doctor', version: '1.0.0' });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    return tools.map(t => t.name);
  } finally {
    await client.close();
  }
}

export async function doctor() {
  let problems = 0;
  const check = (pass, label, hint) => {
    console.log(`  ${pass ? '✅' : '❌'} ${label}${!pass && hint ? `\n       → ${hint}` : ''}`);
    if (!pass) problems++;
  };
  const note = label => console.log(`  ⚠️  ${label}`);

  console.log('\n🩺 SEP doctor\n');
  const major = Number(process.versions.node.split('.')[0]);
  check(major >= 18, `Node.js ${process.versions.node}`, 'Cần Node.js >= 18');
  check(Boolean(tryOutput('git', ['--version'])), 'git có trong PATH', 'Cài git');
  check(isGitWorkTree(KB_ROOT), `KB nằm trong git repo (${KB_ROOT})`, 'Clone repo bằng git');
  const remote = tryOutput('git', ['remote', 'get-url', 'origin'], KB_ROOT);
  check(Boolean(remote), `git remote origin ${remote || ''}`, 'git remote add origin <url>');

  check(fs.existsSync(MCP_ENTRY), 'mcp-server đã build', 'npm run sep -- install');
  if (fs.existsSync(MCP_ENTRY)) {
    const srcNewest = Math.max(...fs.readdirSync(path.join(MCP_DIR, 'src'), { recursive: true })
      .map(f => fs.statSync(path.join(MCP_DIR, 'src', String(f)))).filter(s => s.isFile()).map(s => s.mtimeMs));
    if (srcNewest > fs.statSync(MCP_ENTRY).mtimeMs) note('Mã nguồn mcp-server mới hơn bản build — chạy lại npm run sep -- install');
  }

  const cfg = readInstallConfig();
  check(Boolean(cfg.user), `Đã cài cho @${cfg.user ?? '?'} (${(cfg.ides ?? []).join(', ') || 'chưa cài'})`, 'npm run sep -- install');
  const skills = readSkills().map(s => s.name);
  const personas = readPersonas().map(p => p.name);

  for (const key of cfg.ides ?? []) {
    const t = IDE[key];
    console.log(`\n▶ ${t.label}`);
    const missingSkills = skills.filter(s => !fs.existsSync(path.join(t.skills, s, 'SKILL.md')));
    check(!missingSkills.length, `Skills /sep-* (${skills.length - missingSkills.length}/${skills.length})`, `Thiếu: ${missingSkills.join(', ')} → cài lại`);
    if (t.agents) {
      const missing = personas.filter(p => !fs.existsSync(path.join(t.agents, `${p}.md`)));
      check(!missing.length, `Persona sub-agent (${personas.length - missing.length}/${personas.length})`, 'cài lại');
    }
    if (t.legacyWorkflows) {
      const stale = t.legacyWorkflows.flatMap(d => skills.map(s => path.join(d, `${s}.md`))).filter(f => fs.existsSync(f));
      check(!stale.length, 'Không còn workflow /sep-* kiểu cũ (Antigravity ngừng hỗ trợ workflow từ 1/11/2026)', 'npm run sep -- install để dọn');
    }
    if (t.mcp) {
      const server = readJson(t.mcp).mcpServers?.[SERVER_NAME];
      check(Boolean(server), `MCP "${SERVER_NAME}" trong ${t.mcp}`, 'cài lại');
      if (server) {
        check(server.env?.KB_ROOT && path.resolve(server.env.KB_ROOT) === KB_ROOT, 'MCP trỏ đúng KB này', `Đang trỏ tới ${server.env?.KB_ROOT}`);
        check(server.args?.[0] && fs.existsSync(server.args[0]), 'File chạy MCP tồn tại', server.args?.[0]);
      }
    }
    if (t.hooks) check(JSON.stringify(readJson(t.hooks)).includes('sep-hook.js'), 'Hook ghi telemetry', 'cài lại');
    if (t.settings) check(JSON.stringify(readJson(t.settings)).includes('sep-hook.js'), 'Hook ghi telemetry', 'cài lại');
    if (key === 'claude') {
      const listed = tryOutput('claude', ['mcp', 'list']);
      if (!listed) note('Không chạy được `claude mcp list` — kiểm tra Claude Code CLI');
      else check(listed.includes(SERVER_NAME), `MCP "${SERVER_NAME}" đăng ký trong Claude Code`, 'cài lại');
    }
  }
  check(fs.existsSync(HOOK_SCRIPT), 'Hook script tồn tại', HOOK_SCRIPT);

  console.log('\n▶ Chạy thử MCP server');
  if (fs.existsSync(MCP_ENTRY)) {
    try {
      const tools = await smokeTestMcp({ KB_ROOT, SEP_ASSIGNEE: cfg.user ?? 'doctor', SEP_AUTO_COMMIT: 'false' });
      const expected = (await loadMcp({ build: false })).SEP_TOOL_DEFINITIONS.map(t => t.name);
      const missing = expected.filter(t => !tools.includes(t));
      check(!missing.length, `MCP trả về ${tools.length} tool (${expected.length - missing.length}/${expected.length} tool sep_*)`, `Thiếu ${missing.join(', ')} → build lại mcp-server`);
    } catch (err) {
      check(false, 'Kết nối MCP server', err.message);
    }
  }

  console.log(problems ? `\n❌ ${problems} vấn đề cần xử lý` : '\n✅ Mọi thứ sẵn sàng. Khởi động lại IDE nếu vừa cài.');
  if (problems) process.exitCode = 1;
}
