/**
 * `sep init <repo>` — onboard a code repo: project rules for Cursor (.cursor/rules) and Antigravity
 * (.agents/rules) plus a short pointer block in AGENTS.md. /sep-* commands come from the user-level
 * skills installed by `sep install`.
 * Re-running refreshes generated files; content outside the sep-kit markers is never touched.
 * `--remove` deletes what init generated.
 */

import fs from 'fs';
import path from 'path';
import { KB_ROOT, info, isGitWorkTree, ok, removeBlock, upsertBlock, warn, writeText } from './lib.js';
import { antigravityRule, cursorRule, readRules, readSkills } from './render.js';

const PREFIX = 'sep-kit-';

function agentsPointer(rules) {
  return [
    '## Quy trình SEP (team-ai-knowledge)',
    '',
    'Repo này làm theo quy trình SEP 6 bước: `/sep-spec` → `/sep-brainstorm` → `/sep-verify-spec` → `/sep-apply` → `/sep-test` → `/sep-archive`',
    '(xem tiến độ: `/sep-status`). Mỗi bước kết thúc bằng Approve/Reject của user. Artifact nằm trong',
    `\`${KB_ROOT.replace(/\\/g, '/')}/openspec/\` và chỉ được ghi qua MCP server "sep".`,
    '',
    `Rules chi tiết: \`.cursor/rules/${PREFIX}*.mdc\` (Cursor), \`.agents/rules/${PREFIX}*.md\` (Antigravity) —`,
    `sinh từ \`sep-kit/rules\` (${rules.map(r => r.name).join(', ')}). Cập nhật: \`npm run sep -- init <repo>\`.`,
  ].join('\n');
}

function clearGenerated(dir, ext) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith(PREFIX) && f.endsWith(ext)) fs.rmSync(path.join(dir, f), { force: true });
  }
}

export function initProject(target, flags) {
  if (!target) throw new Error('Thiếu đường dẫn repo. VD: npm run sep -- init ../../sep490-backend');
  const repo = path.resolve(process.cwd(), target);
  if (!fs.existsSync(repo) || !fs.statSync(repo).isDirectory()) throw new Error(`Không thấy thư mục ${repo}`);

  const dirs = {
    cursorRules: path.join(repo, '.cursor', 'rules'),
    agRules: path.join(repo, '.agents', 'rules'),
    /** Written by older kit versions; Antigravity retires workflows on 2026-11-01 */
    agWorkflows: path.join(repo, '.agents', 'workflows'),
  };
  const removeLegacyWorkflows = () => {
    for (const s of readSkills()) fs.rmSync(path.join(dirs.agWorkflows, `${s.name}.md`), { force: true });
  };

  if (flags.remove) {
    clearGenerated(dirs.cursorRules, '.mdc');
    clearGenerated(dirs.agRules, '.md');
    removeLegacyWorkflows();
    removeBlock(path.join(repo, 'AGENTS.md'));
    ok(`Đã gỡ rules SEP khỏi ${repo}`);
    return;
  }

  const rules = readRules();
  clearGenerated(dirs.cursorRules, '.mdc');
  clearGenerated(dirs.agRules, '.md');
  for (const r of rules) {
    writeText(path.join(dirs.cursorRules, `${PREFIX}${r.name}.mdc`), cursorRule(r));
    writeText(path.join(dirs.agRules, `${PREFIX}${r.name}.md`), antigravityRule(r));
  }
  ok(`${rules.length} rule → .cursor/rules, .agents/rules`);
  removeLegacyWorkflows();
  upsertBlock(path.join(repo, 'AGENTS.md'), agentsPointer(rules));
  ok('AGENTS.md: khối "Quy trình SEP"');

  if (!isGitWorkTree(repo)) warn(`${repo} không phải git repo.`);
  info('Commit các file vừa sinh để cả team dùng chung rules.');
}
