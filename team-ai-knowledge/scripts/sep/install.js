/**
 * `sep install` / `sep uninstall` — user-scope setup for Cursor, Claude Code and Antigravity:
 * skills (/sep-*), persona sub-agents, MCP server "sep", prompt hooks, global rules.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import {
  HOME, HOOK_SCRIPT, IDE, IDE_KEYS, KB_ROOT, MCP_ENTRY, SEP_HOME, SERVER_NAME,
  buildMcp, info, isGitWorkTree, ok, readJson, removeBlock, tryOutput, upsertBlock, warn, writeJson, writeText,
} from './lib.js';
import {
  agentFile, antigravityRule,
  readPersonas, readRules, readSkills, rulesBlock,
} from './render.js';

const LEGACY_COMMANDS = ['sep-spec.md', 'sep-continue.md', 'sep-apply.md', 'sep-status.md'];
const LEGACY_COMMAND_DIRS = [path.join(HOME, '.cursor', 'commands'), path.join(HOME, '.claude', 'commands')];
const CONFIG_FILE = path.join(SEP_HOME, 'config.json');
const isOurHook = h => JSON.stringify(h).includes('sep-hook.js');

export function readInstallConfig() {
  return readJson(CONFIG_FILE);
}

export function selectIdes(flags) {
  if (typeof flags.ide === 'string') {
    const wanted = flags.ide.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const bad = wanted.filter(k => !IDE_KEYS.includes(k));
    if (bad.length) throw new Error(`--ide không hợp lệ: ${bad.join(', ')}. Chọn trong: ${IDE_KEYS.join(', ')}`);
    return wanted;
  }
  const found = IDE_KEYS.filter(k => fs.existsSync(IDE[k].root) || (k === 'claude' && tryOutput('claude', ['--version'])));
  return found.length ? found : ['cursor'];
}

async function askUsername(flags) {
  if (typeof flags.user === 'string' && flags.user.trim()) return flags.user.trim();
  const saved = readInstallConfig().user;
  const guess = saved || tryOutput('gh', ['api', 'user', '--jq', '.login']) || tryOutput('git', ['config', '--global', 'github.user']);
  if (flags.yes && guess) return guess;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`GitHub username của bạn${guess ? ` [${guess}]` : ''}: `)).trim();
  rl.close();
  const user = answer || guess;
  if (!user) throw new Error('Cần GitHub username (TeamSpec dùng nó làm assignee để lọc "My Changes").');
  return user;
}

function copyDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

function mcpServer(env) {
  return { command: 'node', args: [MCP_ENTRY], env };
}

function mergeMcpJson(file, env) {
  const cfg = readJson(file);
  cfg.mcpServers = { ...(cfg.mcpServers ?? {}), [SERVER_NAME]: mcpServer(env) };
  writeJson(file, cfg);
}

function removeMcpJson(file) {
  const cfg = readJson(file);
  if (!cfg.mcpServers?.[SERVER_NAME]) return false;
  delete cfg.mcpServers[SERVER_NAME];
  writeJson(file, cfg);
  return true;
}

function hookCommand(ide) {
  return `node "${HOOK_SCRIPT}" ${ide}`;
}

// ── Per-IDE installers ───────────────────────────────────────────────────────

function installCursor(env, skills, personas) {
  const t = IDE.cursor;
  for (const s of skills) copyDir(s.dir, path.join(t.skills, s.name));
  ok(`${skills.length} skill → ${t.skills}`);
  for (const p of personas) writeText(path.join(t.agents, `${p.name}.md`), agentFile(p, 'cursor'));
  ok(`${personas.length} persona sub-agent → ${t.agents}`);
  mergeMcpJson(t.mcp, env);
  ok(`MCP "${SERVER_NAME}" → ${t.mcp}`);

  const hooks = readJson(t.hooks);
  hooks.version = hooks.version ?? 1;
  hooks.hooks = hooks.hooks ?? {};
  const list = (hooks.hooks.beforeSubmitPrompt ?? []).filter(h => !isOurHook(h));
  hooks.hooks.beforeSubmitPrompt = [...list, { command: hookCommand('cursor'), timeout: 5 }];
  writeJson(t.hooks, hooks);
  ok(`Hook beforeSubmitPrompt → ${t.hooks}`);
  info('Rules cho Cursor là rules cấp project: chạy `npm run sep -- init <repo>` cho từng repo code.');
}

function installClaude(env, skills, personas, rules) {
  const t = IDE.claude;
  for (const s of skills) copyDir(s.dir, path.join(t.skills, s.name));
  ok(`${skills.length} skill → ${t.skills}`);
  for (const p of personas) writeText(path.join(t.agents, `${p.name}.md`), agentFile(p, 'claude'));
  ok(`${personas.length} persona agent → ${t.agents}`);

  const settings = readJson(t.settings);
  settings.hooks = settings.hooks ?? {};
  const list = (settings.hooks.UserPromptSubmit ?? []).filter(h => !isOurHook(h));
  settings.hooks.UserPromptSubmit = [...list, { hooks: [{ type: 'command', command: hookCommand('claude'), timeout: 5 }] }];
  writeJson(t.settings, settings);
  ok(`Hook UserPromptSubmit → ${t.settings}`);

  upsertBlock(t.memory, rulesBlock(rules));
  ok(`Rules SEP → ${t.memory} (khối sep-kit)`);

  if (!tryOutput('claude', ['--version'])) {
    warn('Không tìm thấy Claude Code CLI — bỏ qua đăng ký MCP. Cài Claude Code xong chạy lại lệnh này.');
    return;
  }
  tryOutput('claude', ['mcp', 'remove', SERVER_NAME, '--scope', 'user']);
  const envArgs = Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`]);
  const added = tryOutput('claude', ['mcp', 'add', SERVER_NAME, '--scope', 'user', ...envArgs, '--', 'node', MCP_ENTRY]);
  if (added !== '' || tryOutput('claude', ['mcp', 'get', SERVER_NAME])) ok(`MCP "${SERVER_NAME}" (Claude Code, scope user)`);
  else warn(`Không đăng ký được MCP cho Claude Code. Chạy tay:\n     claude mcp add ${SERVER_NAME} --scope user ${envArgs.join(' ')} -- node "${MCP_ENTRY}"`);
}

function installAntigravity(env, skills, rules) {
  const t = IDE.antigravity;
  for (const s of skills) copyDir(s.dir, path.join(t.skills, s.name));
  ok(`${skills.length} skill /sep-* → ${t.skills}`);
  if (removeLegacyWorkflows(t, skills)) ok('Đã gỡ workflow /sep-* kiểu cũ (skill thay thế, tránh lệnh trùng)');
  for (const r of rules) writeText(path.join(t.rules, `sep-kit-${r.name}.md`), antigravityRule(r));
  ok(`${rules.length} rule → ${t.rules}`);
  mergeMcpJson(t.mcp, env);
  ok(`MCP "${SERVER_NAME}" → ${t.mcp}`);
  if (fs.existsSync(t.legacyMcp)) {
    mergeMcpJson(t.legacyMcp, env);
    ok(`MCP "${SERVER_NAME}" → ${t.legacyMcp} (bản Antigravity cũ)`);
  }
  info('Antigravity không có sub-agent tuỳ biến: /sep-verify-spec sẽ tự đóng vai persona qua sep_xem_persona.');
}

/** @returns true when at least one old workflow file was removed */
function removeLegacyWorkflows(t, skills) {
  let removed = false;
  for (const dir of t.legacyWorkflows ?? []) {
    for (const s of skills) {
      const file = path.join(dir, `${s.name}.md`);
      if (fs.existsSync(file)) {
        fs.rmSync(file, { force: true });
        removed = true;
      }
    }
  }
  return removed;
}

function removeLegacyCommands() {
  for (const dir of LEGACY_COMMAND_DIRS) {
    for (const f of LEGACY_COMMANDS) fs.rmSync(path.join(dir, f), { force: true });
  }
}

// ── Commands ─────────────────────────────────────────────────────────────────

export async function install(flags) {
  console.log('\n🚀 SEP Kit — cài đặt\n');
  const user = await askUsername(flags);
  const ides = selectIdes(flags);
  const project = typeof flags.project === 'string' ? flags.project : readInstallConfig().project || 'MT-GRMS';
  buildMcp();
  ok('mcp-server đã build');

  const env = {
    KB_ROOT,
    SEP_ASSIGNEE: user,
    SEP_PROJECT: project,
    SEP_AUTO_COMMIT: flags['no-commit'] ? 'false' : 'true',
    SEP_AUTO_PUSH: flags.push ? 'true' : 'false',
    // Cursor / Claude Code / Antigravity get native /sep-* skills — MCP prompts would duplicate them
    SEP_PROMPTS: 'false',
  };
  const skills = readSkills();
  const personas = readPersonas();
  const rules = readRules();

  for (const ide of ides) {
    console.log(`\n▶ ${IDE[ide].label}`);
    if (ide === 'cursor') installCursor(env, skills, personas);
    if (ide === 'claude') installClaude(env, skills, personas, rules);
    if (ide === 'antigravity') installAntigravity(env, skills, rules);
  }
  removeLegacyCommands();
  writeJson(CONFIG_FILE, { kbRoot: KB_ROOT, user, project, ides, push: env.SEP_AUTO_PUSH === 'true', installedAt: new Date().toISOString() });

  if (flags.link) {
    const linked = tryOutput('npm', ['link'], KB_ROOT);
    if (linked !== '' || tryOutput('sep', ['--version'])) ok('Đã đăng ký lệnh `sep` toàn cục (npm link)');
    else warn('npm link thất bại — dùng `npm run sep -- <lệnh>` trong team-ai-knowledge.');
  }
  if (!isGitWorkTree(KB_ROOT)) {
    warn(`${KB_ROOT} không phải git repo — change sẽ không được commit. Hãy clone team-ai-knowledge bằng git.`);
  }

  console.log(`
🎉 Xong! Assignee: @${user} · IDE: ${ides.map(k => IDE[k].label).join(', ')}

Tiếp theo:
  1. Khởi động lại IDE (Cursor: Settings → MCP → bật "${SERVER_NAME}").
  2. Mỗi repo code (backend/frontend):  npm run sep -- init <đường-dẫn-repo>
  3. Trong chat:  /sep-spec tôi muốn thực hiện chức năng <mô tả>
     rồi /sep-brainstorm → /sep-verify-spec → /sep-apply → /sep-test → /sep-archive (mỗi bước có Approve/Reject)
  4. Kiểm tra cài đặt:  npm run sep -- doctor
${env.SEP_AUTO_PUSH === 'true'
    ? '  • Mỗi artifact được commit + push tự động lên GitHub.'
    : '  • Mỗi artifact được commit tự động. Chạy "git push" để TeamSpec thấy (hoặc cài lại với --push).'}
`);
}

export function uninstall(flags) {
  console.log('\n🧹 Gỡ SEP Kit\n');
  const ides = typeof flags.ide === 'string' ? selectIdes(flags) : IDE_KEYS;
  const skills = readSkills();
  const personas = readPersonas();
  const rules = readRules();

  for (const ide of ides) {
    const t = IDE[ide];
    for (const s of skills) fs.rmSync(path.join(t.skills, s.name), { recursive: true, force: true });
    if (t.agents) for (const p of personas) fs.rmSync(path.join(t.agents, `${p.name}.md`), { force: true });
    if (t.mcp && removeMcpJson(t.mcp)) ok(`${t.label}: đã xoá MCP`);
    if (t.legacyMcp && removeMcpJson(t.legacyMcp)) ok(`${t.label}: đã xoá MCP (bản cũ)`);
    removeLegacyWorkflows(t, skills);
    if (t.rules) for (const r of rules) fs.rmSync(path.join(t.rules, `sep-kit-${r.name}.md`), { force: true });
    if (t.hooks && fs.existsSync(t.hooks)) {
      const hooks = readJson(t.hooks);
      if (hooks.hooks?.beforeSubmitPrompt) hooks.hooks.beforeSubmitPrompt = hooks.hooks.beforeSubmitPrompt.filter(h => !isOurHook(h));
      writeJson(t.hooks, hooks);
    }
    if (t.settings && fs.existsSync(t.settings)) {
      const settings = readJson(t.settings);
      if (settings.hooks?.UserPromptSubmit) settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(h => !isOurHook(h));
      writeJson(t.settings, settings);
    }
    if (t.memory) removeBlock(t.memory);
    if (ide === 'claude' && tryOutput('claude', ['--version'])) tryOutput('claude', ['mcp', 'remove', SERVER_NAME, '--scope', 'user']);
    ok(`${t.label}: đã gỡ skills, persona, rules, hooks`);
  }
  removeLegacyCommands();
  fs.rmSync(CONFIG_FILE, { force: true });
  info('Rules cấp project (.cursor/rules, .agents/…) gỡ bằng: npm run sep -- init <repo> --remove');
}
