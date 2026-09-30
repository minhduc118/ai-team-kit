/**
 * End-to-end test of the SEP workflow on a throw-away KB copy (needs `npm run build` in mcp-server).
 *   node mcp-server/test-sep.js
 */

import assert from 'assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSepWorkflow } from './dist/tools/sepWorkflow.js';
import { mergeDeltaSpec } from './dist/tools/specMerge.js';
import { LocalProvider } from './dist/providers/localProvider.js';

const KB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sep-test-'));
for (const dir of ['openspec/schemas', 'sep-kit/agents', '.opsx/instructions']) {
  fs.cpSync(path.join(KB, dir), path.join(tmp, dir), { recursive: true });
}
fs.copyFileSync(path.join(KB, 'openspec/config.yaml'), path.join(tmp, 'openspec/config.yaml'));

let active = null;
const commits = [];
const provider = new LocalProvider(tmp);
const sep = createSepWorkflow(provider, {
  defaultAssignee: 'tester',
  activeStore: { get: async () => active, set: async n => { active = n; } },
  afterWrite: async (files, msg) => { commits.push({ files, msg }); return 'ok'; },
});

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    console.log(`  ❌ ${name}\n     ${err.message}`);
    process.exitCode = 1;
  }
}
const rejects = (p, re) => assert.rejects(p, err => re.test(err.message));
const save = (file, noiDung, tenChange) => sep.handleLuuArtifact({ file, noiDung, tenChange });
const approve = buoc => sep.handleDuyetBuoc({ buoc, quyetDinh: 'approve', tomTat: `ok ${buoc}`, caiTien: `bài học ${buoc}` });
const read = rel => fs.readFileSync(path.join(tmp, rel), 'utf8');
const C = 'openspec/changes/supplier-crud';

const SPECS = `# Specs
## ADDED Requirements
### Requirement: REQ-01 Tạo nhà cung cấp
Hệ thống MUST tạo nhà cung cấp.
#### Scenario: ok
- GIVEN a
- WHEN b
- THEN c

### Requirement: REQ-02 Xoá nhà cung cấp
Hệ thống MUST xoá mềm.
`;

console.log(`\n🧪 SEP workflow (KB tạm: ${tmp})\n`);

await test('tạo change feature → gate bật, chọn làm change đang làm', async () => {
  const out = await sep.handleTaoChange({ moTa: 'Quản lý nhà cung cấp', tenChange: 'supplier-crud', capability: 'supplier' });
  assert.match(out, /Đã tạo change/);
  assert.equal(active, 'supplier-crud');
  assert.match(read(`${C}/.session.md`), /gate: true/);
  assert.match(read(`${C}/.session.md`), /schema: feature/);
});

await test('lưu proposal (bỏ trống tenChange = change đang làm)', async () => {
  await save('proposal.md', '# Proposal');
  assert.ok(fs.existsSync(path.join(tmp, C, 'proposal.md')));
});

await test('chưa duyệt spec → chặn brainstorm', () => rejects(save('exploration.md', '# E'), /chưa được duyệt/));

await test('reject spec → ghi summary, vẫn chặn', async () => {
  const out = await sep.handleDuyetBuoc({ quyetDinh: 'reject', tomTat: 'thiếu tiêu chí' });
  assert.match(out, /từ chối/);
  assert.match(read(`${C}/summary.md`), /Reject/);
  await rejects(save('exploration.md', '# E'), /chưa được duyệt/);
});

await test('approve spec → mở khoá brainstorm, ghi improvements', async () => {
  await approve('spec');
  assert.match(read(`${C}/improvements.md`), /bài học spec/);
  await save('exploration.md', '# E');
});

await test('duyệt bước chưa xong bị từ chối', () => rejects(approve('brainstorm'), /chưa xong/));

await test('hướng dẫn bước có bối cảnh config.yaml + schema.yaml', async () => {
  const out = await sep.handleXemChange({});
  assert.match(out, /Bối cảnh dự án/);
  assert.match(out, /openspec\/schemas\/feature/);
});

await test('brainstorm đủ file + research tuỳ chọn → duyệt', async () => {
  await save('research.md', '# R');
  await save('design-brief.md', '# D');
  await save('specs.md', SPECS);
  await approve('brainstorm');
});

await test('persona: liệt kê + đọc skeptic', async () => {
  assert.match(await sep.handleXemPersona({}), /skeptic/);
  assert.match(await sep.handleXemPersona({ ten: 'skeptic' }), /D1 Completeness/);
});

await test('verify-spec: review đa persona + tasks không checkbox bị chặn', async () => {
  await save('review/skeptic.md', '# S');
  await save('review/guardian.md', '# G');
  await rejects(save('tasks.md', '# no tasks'), /checklist/);
  await save('tasks.md', '- [ ] T1\n- [ ] T2');
});

await test('apply bị chặn khi verify-spec chưa duyệt', () =>
  rejects(sep.handleChuyenTrangThai({ trangThai: 'apply' }), /chưa được duyệt/));

await test('apply → tick task → duyệt apply', async () => {
  await approve('verify-spec');
  await sep.handleChuyenTrangThai({ trangThai: 'apply' });
  await rejects(approve('apply'), /chưa xong/);
  await save('tasks.md', '- [x] T1\n- [x] T2');
  await approve('apply');
});

await test('test-report thiếu verdict bị chặn; FAIL chưa cho archive', async () => {
  await rejects(save('test-report.md', '# R'), /verdict/);
  await save('test-report.md', '---\nverdict: FAIL\n---\n# R');
  await rejects(sep.handleChuyenTrangThai({ trangThai: 'archived' }), /Test chưa xong|verdict/);
});

await test('PASS + duyệt test → archive merge spec gốc', async () => {
  await save('test-report.md', '---\nverdict: PASS\n---\n# R');
  await rejects(sep.handleChuyenTrangThai({ trangThai: 'archived' }), /chưa được duyệt/);
  await approve('test');
  const out = await sep.handleChuyenTrangThai({ trangThai: 'archived' });
  assert.match(out, /openspec\/specs\/supplier\/spec\.md`: \+2 ~0 -0/);
  const spec = read('openspec/specs/supplier/spec.md');
  assert.match(spec, /REQ-01 Tạo nhà cung cấp/);
  assert.ok(commits.at(-1).files.includes('openspec/specs/supplier/spec.md'));
});

await test('change thứ 2 cùng capability: MODIFIED + REMOVED cộng dồn', async () => {
  const delta = `## MODIFIED Requirements
### Requirement: REQ-01 Tạo nhà cung cấp
Hệ thống MUST tạo nhà cung cấp và kiểm tra trùng mã số thuế.
## REMOVED Requirements
### Requirement: REQ-02 Xoá nhà cung cấp
`;
  const r = mergeDeltaSpec(read('openspec/specs/supplier/spec.md'), delta, { capability: 'supplier', change: 'supplier-tax', date: '2026-10-01' });
  assert.deepEqual([r.added.length, r.modified.length, r.removed.length], [0, 1, 1]);
  assert.match(r.content, /mã số thuế/);
  assert.doesNotMatch(r.content, /REQ-02/);
  assert.match(r.content, /supplier-crud/);
  assert.match(r.content, /supplier-tax/);
  assert.equal(r.warnings.length, 0);
});

await test('archived → không sửa artifact', () => rejects(save('specs.md', '# x', 'supplier-crud'), /đã archive/));

await test('schema bug-fix: không cần + không nhận design-brief', async () => {
  await sep.handleTaoChange({ moTa: 'Lỗi tính thuế', tenChange: 'tax-bug', schema: 'bug-fix' });
  await save('proposal.md', '# P');
  await approve('spec');
  await rejects(save('design-brief.md', '# D'), /không dùng design-brief/);
  await save('exploration.md', '# root cause');
  await save('specs.md', '## MODIFIED Requirements\n### Requirement: Thuế\nMUST đúng.');
  const info = await sep.inspectChange('tax-bug');
  assert.equal(info.steps[1].gap, null);
  assert.equal(info.next.kind, 'approve');
});

await test('change cũ (không gate) không cần duyệt', async () => {
  const dir = path.join(tmp, 'openspec/changes/legacy');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.session.md'), '---\nassignee: old\n---\n# legacy\n');
  fs.writeFileSync(path.join(dir, '.status'), 'spec\n');
  await save('proposal.md', '# P', 'legacy');
  await save('exploration.md', '# E', 'legacy');
});

await test('danh sách: 📌 change vừa thao tác + việc tiếp theo', async () => {
  const out = await sep.handleDanhSachChange({ assignee: '*' });
  assert.match(out, /📌 legacy/);
  assert.match(out, /tax-bug .* duyệt bước Brainstorm/);
});

await test('sep_chon_change đổi change đang làm', async () => {
  await sep.handleChonChange({ tenChange: 'tax-bug' });
  assert.equal(active, 'tax-bug');
  await rejects(sep.handleChonChange({ tenChange: 'khong-ton-tai' }), /Không tìm thấy/);
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${process.exitCode ? '❌' : '✅'} ${passed} test pass · ${commits.length} commit giả lập\n`);
