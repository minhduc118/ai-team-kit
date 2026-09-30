/**
 * Tests for the non-SEP parts of the MCP server: path safety, generated docs, git queue,
 * argument validation, intent analyzer, HTTP auth, prompts, and a real stdio client round-trip.
 *   node mcp-server/test-kb.js   (needs `npm run build` in mcp-server)
 */

import assert from 'assert/strict';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { safeRelPath } from './dist/providers/dataProvider.js';
import { LocalProvider } from './dist/providers/localProvider.js';
import { createToolHandlers } from './dist/tools/toolHandlers.js';
import { createGitSync } from './dist/tools/gitSync.js';
import { validateArgs } from './dist/tools/argValidation.js';
import { analyzeIntent } from './dist/tools/intentAnalyzer.js';
import { authenticate, loadAuthConfig, parseAuthTokens } from './dist/tools/httpAuth.js';
import { loadSepPrompts, renderPrompt } from './dist/tools/sepPrompts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KB = path.resolve(HERE, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-test-'));
const outside = path.join(path.dirname(tmp), `kb-test-outside-${Date.now()}.md`);

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    console.log(`  ❌ ${name}\n     ${err.stack?.split('\n').slice(0, 2).join('\n     ')}`);
    process.exitCode = 1;
  }
}
const rejects = (p, re) => assert.rejects(p, err => re.test(err.message));
const read = rel => fs.readFileSync(path.join(tmp, rel), 'utf8');

const commits = [];
const provider = new LocalProvider(tmp);
const kb = createToolHandlers(provider, {
  author: 'tester',
  afterWrite: async (files, msg) => { commits.push({ files, msg }); return `committed ${msg}`; },
});

console.log(`\n🧪 KB tools (KB tạm: ${tmp})\n`);

await test('safeRelPath chặn đường dẫn thoát KB', () => {
  for (const bad of ['../x.md', 'a/../../x.md', '/etc/passwd', 'C:/Windows/x', 'C:\\x', '.git/config', 'a\0b']) {
    assert.throws(() => safeRelPath(bad), undefined, bad);
  }
  assert.equal(safeRelPath('a\\b/./c.md'), 'a/b/c.md');
  assert.equal(safeRelPath(''), '');
});

await test('LocalProvider không ghi/đọc/xoá ngoài KB', async () => {
  await rejects(provider.writeFile(`../${path.basename(outside)}`, 'x'), /\.\./);
  assert.equal(fs.existsSync(outside), false);
  assert.equal(await provider.readFile('../../etc/hosts'), null);
  assert.equal(await provider.fileExists('../'), false);
  await rejects(provider.deleteFile('../x.md'), /\.\./);
});

await test('luu_phien_lam_viec: chặn projectName độc, ghi author thật + commit', async () => {
  await rejects(kb.handleLuuPhienLamViec({ projectName: '../../evil', title: 't', goals: [], summary: 's' }), /Tên dự án không hợp lệ/);
  await rejects(kb.handleLuuPhienLamViec({ projectName: 'a/b', title: 't', goals: [], summary: 's' }), /Tên dự án không hợp lệ/);
  const out = await kb.handleLuuPhienLamViec({
    projectName: 'MT-GRMS', title: 'Làm "checkout": bước 1', goals: ['a: b', 'c'], summary: 'Nội dung',
  });
  const file = out.match(/saved to: (\S+)/)[1];
  const { data, content } = matter(read(file));
  assert.equal(data.author, 'tester');
  assert.equal(data.project, 'MT-GRMS');
  assert.deepEqual(data.goals, ['a: b', 'c']);
  assert.equal(typeof data.date, 'string');
  assert.match(content, /# Session Summary: Làm "checkout": bước 1/);
  assert.deepEqual(commits.at(-1).files, [file]);
  assert.match(out, /🔀 committed kb\(MT-GRMS\): session/);
});

await test('trùng tiêu đề trong ngày → thêm hậu tố, không ghi đè', async () => {
  const a = await kb.handleLuuPhienLamViec({ projectName: 'MT-GRMS', title: 'Trùng', goals: [], summary: '1' });
  const b = await kb.handleLuuPhienLamViec({ projectName: 'MT-GRMS', title: 'Trùng', goals: [], summary: '2' });
  const fa = a.match(/saved to: (\S+)/)[1];
  const fb = b.match(/saved to: (\S+)/)[1];
  assert.notEqual(fa, fb);
  assert.match(fb, /-2\.md$/);
  assert.match(read(fa), /\n1\n/);
});

await test('luu_bai_hoc: tiêu đề có dấu nháy/hai chấm vẫn là YAML hợp lệ', async () => {
  const title = 'Lỗi "JWT": hết hạn # sớm';
  const out = await kb.handleLuuBaiHoc({
    title, scope: 'backend', severity: 'high', resolution: 'resolved', problem: 'p', solution: 's',
  });
  const file = out.match(/saved to: (\S+)/)[1];
  const { data } = matter(read(file));
  assert.equal(data.title, title);
  assert.equal(data.author, 'tester');
  assert.match(commits.at(-1).msg, /^kb: lesson LL-/);
});

await test('luu_danh_gia: ký tự | trong ô bảng được escape', async () => {
  const out = await kb.handleLuuDanhGia({
    projectName: 'MT-GRMS', title: 'Review', completeness: 'PASS | ok', correctness: 'PASS',
    coherence: 'PASS', constraints: 'WARNING\nxuống dòng', blastRadius: 'PASS', summary: 'ok',
  });
  const body = read(out.match(/saved to: (\S+)/)[1]);
  assert.match(body, /\| D1: Completeness \| PASS \\\| ok \|/);
  assert.match(body, /\| D4: Constraints \| WARNING xuống dòng \|/);
});

await test('lưu trữ/khôi phục: chỉ file .md trong _global|projects, commit cả 2 đường dẫn', async () => {
  fs.mkdirSync(path.join(tmp, 'openspec/changes/x'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'openspec/changes/x/proposal.md'), '# p');
  await rejects(kb.handleLuuTruKienThuc('openspec/changes/x/proposal.md'), /Chỉ lưu trữ/);
  await rejects(kb.handleLuuTruKienThuc('../outside.md'), /\.\./);
  await rejects(kb.handleLuuTruKienThuc('projects/MT-GRMS/x.txt'), /Chỉ lưu trữ/);

  const src = 'projects/MT-GRMS/decisions/ADR-9.md';
  fs.mkdirSync(path.join(tmp, 'projects/MT-GRMS/decisions'), { recursive: true });
  fs.writeFileSync(path.join(tmp, src), '---\nid: ADR-9\nstatus: accepted\n---\n# ADR');
  const out = await kb.handleLuuTruKienThuc(src, 'thay bằng ADR-10');
  const dst = 'projects/MT-GRMS/archive/decisions/ADR-9.md';
  assert.match(out, /archived to: projects\/MT-GRMS\/archive\/decisions\/ADR-9\.md/);
  assert.equal(fs.existsSync(path.join(tmp, src)), false);
  assert.equal(matter(read(dst)).data.archive_reason, 'thay bằng ADR-10');
  assert.deepEqual(commits.at(-1).files, [dst, src]);

  await kb.handlePhucHoiKienThuc(dst);
  assert.equal(matter(read(src)).data.status, 'active');
  assert.equal(fs.existsSync(path.join(tmp, dst)), false);
});

await test('gitSync: 5 lần ghi song song → 5 commit, commit được file bị xoá', async () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-git-'));
  const git = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'user.email', 't@t');
  git('config', 'user.name', 't');
  git('config', 'commit.gpgsign', 'false');
  const sync = createGitSync(repo);
  const names = [1, 2, 3, 4, 5].map(i => `f${i}.md`);
  names.forEach(n => fs.writeFileSync(path.join(repo, n), n));
  const results = await Promise.all(names.map(n => sync([n], `add ${n}`)));
  results.forEach(r => assert.match(r, /đã commit/));
  assert.equal(git('rev-list', '--count', 'HEAD'), '5');

  fs.renameSync(path.join(repo, 'f1.md'), path.join(repo, 'moved.md'));
  assert.match(await sync(['moved.md', 'f1.md', 'never-existed.md'], 'move'), /đã commit/);
  assert.equal(git('ls-files', 'f1.md'), '');
  assert.equal(git('ls-files', 'moved.md'), 'moved.md');
  fs.rmSync(repo, { recursive: true, force: true });
});

await test('validateArgs: thiếu/sai kiểu/enum/tham số lạ/ép số', () => {
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      days: { type: 'number' },
      mode: { type: 'string', enum: ['a', 'b'] },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['name'],
  };
  assert.deepEqual(validateArgs(schema, { name: 'x', days: '3' }), { ok: true, args: { name: 'x', days: 3 } });
  const bad = validateArgs(schema, { name: '  ', days: 'abc', mode: 'c', tags: [1], changeName: 'y' });
  assert.equal(bad.ok, false);
  for (const re of [/thiếu "name"/, /"days" phải là number/, /"mode" phải là một trong: a, b/, /"tags" phải là mảng string/, /tham số lạ "changeName"/]) {
    assert.ok(bad.errors.some(e => re.test(e)), `${re} ∉ ${bad.errors.join(' | ')}`);
  }
  assert.equal(validateArgs(schema, 'oops').ok, false);
});

await test('intent analyzer chỉ gọi tool đọc, nhận ra ngữ cảnh SEP', () => {
  const write = /^(luu_|phuc_hoi|sep_(tao|luu|duyet|chuyen|chon))/;
  for (const chatContext of ['xoá file cũ và review lại, lưu trữ', 'restore active archive', 'đánh giá kiểm tra chấm điểm']) {
    for (const i of analyzeIntent({ chatContext })) assert.doesNotMatch(i.toolName, write, chatContext);
  }
  const sep = analyzeIntent({ chatContext: 'làm tiếp chức năng nhà cung cấp, bước tiếp theo là gì' });
  assert.ok(sep.some(i => i.toolName === 'sep_danh_sach_change'));
  assert.ok(!analyzeIntent({ chatContext: 'mẫu gì đó' }).some(i => i.toolName === 'xem_bieu_mau'));
  assert.equal(analyzeIntent({ chatContext: 'cho tôi template lesson' }).find(i => i.toolName === 'xem_bieu_mau')?.extractedParams.type, 'lesson');
});

await test('HTTP auth: token → user, sai token/thiếu token bị từ chối', () => {
  assert.throws(() => loadAuthConfig({}), /MCP_AUTH_TOKENS/);
  assert.throws(() => parseAuthTokens('short:u'), /≥ 16/);
  assert.throws(() => parseAuthTokens('nouser'), /token:githubUser/);
  const cfg = loadAuthConfig({ MCP_AUTH_TOKENS: 'aaaaaaaaaaaaaaaa1:minh, bbbbbbbbbbbbbbbb2:des' });
  assert.equal(authenticate('Bearer aaaaaaaaaaaaaaaa1', cfg), 'minh');
  assert.equal(authenticate('bearer bbbbbbbbbbbbbbbb2', cfg), 'des');
  assert.equal(authenticate('Bearer wrongwrongwrong00', cfg), undefined);
  assert.equal(authenticate(undefined, cfg), undefined);
  const anon = loadAuthConfig({ MCP_ALLOW_ANONYMOUS: 'true' });
  assert.equal(authenticate(undefined, anon), null);
});

await test('prompts: 7 skill /sep-* từ sep-kit, chèn đầu vào của user', async () => {
  const prompts = await loadSepPrompts(new LocalProvider(KB));
  const names = prompts.map(p => p.name).sort();
  assert.deepEqual(names, ['sep-apply', 'sep-archive', 'sep-brainstorm', 'sep-spec', 'sep-status', 'sep-test', 'sep-verify-spec']);
  const spec = prompts.find(p => p.name === 'sep-spec');
  assert.ok(spec.description.length > 10);
  assert.match(renderPrompt(spec, 'quản lý kho'), /Đầu vào của user: quản lý kho$/);
  assert.doesNotMatch(renderPrompt(spec), /Đầu vào của user/);
});

await test('stdio thật: annotations, lỗi tham số rõ ràng, prompts, chặn path traversal', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-home-'));
  fs.cpSync(path.join(KB, 'sep-kit/skills'), path.join(tmp, 'sep-kit/skills'), { recursive: true });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(HERE, 'dist/index.js')],
    env: { ...process.env, KB_ROOT: tmp, SEP_HOME: home, SEP_AUTO_COMMIT: 'false', SEP_ASSIGNEE: 'tester', GITHUB_TOKEN: '' },
    stderr: 'ignore',
  });
  const client = new Client({ name: 'test-kb', version: '1.0.0' });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map(t => [t.name, t]));
    assert.equal(byName.xem_tong_quan.annotations.readOnlyHint, true);
    assert.equal(byName.luu_tru_kien_thuc.annotations.destructiveHint, true);
    assert.equal(byName.sep_luu_artifact.annotations.readOnlyHint, false);
    assert.equal(byName.sep_luu_artifact.annotations.idempotentHint, true);

    const missing = await client.callTool({ name: 'luu_bai_hoc', arguments: { title: 'x' } });
    assert.equal(missing.isError, true);
    assert.match(missing.content[0].text, /thiếu "scope"/);

    const typo = await client.callTool({ name: 'sep_xem_change', arguments: { changeName: 'abc' } });
    assert.equal(typo.isError, true);
    assert.match(typo.content[0].text, /tham số lạ "changeName"/);

    const evil = await client.callTool({
      name: 'luu_phien_lam_viec',
      arguments: { projectName: '../../..', title: 'x', goals: [], summary: 'x' },
    });
    assert.equal(evil.isError, true);

    const { prompts } = await client.listPrompts();
    assert.equal(prompts.length, 7);
    const got = await client.getPrompt({ name: 'sep-status', arguments: { input: 'supplier' } });
    assert.match(got.messages[0].content.text, /Đầu vào của user: supplier/);
  } finally {
    await client.close();
    fs.rmSync(home, { recursive: true, force: true });
  }
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${process.exitCode ? '❌' : '✅'} ${passed} test pass\n`);
