/**
 * Git sync for local mode — commits (and optionally pushes) KB files
 * with the developer's own git identity, so TeamSpec shows the real author.
 *
 *   SEP_AUTO_COMMIT=false  → disable commits (default: enabled)
 *   SEP_AUTO_PUSH=true     → push after each commit (default: disabled)
 */

import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const run = promisify(execFile);

async function git(kbRoot: string, args: string[]): Promise<string> {
  const { stdout } = await run('git', args, { cwd: kbRoot, timeout: 30_000, windowsHide: true });
  return stdout.trim();
}

/** True when kbRoot is inside a git work tree (the KB may be a subfolder of a larger repo) */
export function isGitWorkTree(dir: string): boolean {
  try {
    return execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true,
    }).trim() === 'true';
  } catch {
    return false;
  }
}

export function createGitSync(kbRoot: string) {
  const enabled = process.env.SEP_AUTO_COMMIT !== 'false' && isGitWorkTree(kbRoot);
  const push = process.env.SEP_AUTO_PUSH === 'true';
  // Agents may call several write tools in parallel; git holds index.lock, so run one sync at a time
  let queue: Promise<unknown> = Promise.resolve();

  async function sync(paths: string[], message: string): Promise<string | null> {
    try {
      // A deleted path only belongs in the commit if git tracks it (archive/restore moves)
      const tracked = new Set((await git(kbRoot, ['ls-files', '--', ...paths])).split('\n').filter(Boolean));
      const targets = paths.filter(p => fs.existsSync(path.join(kbRoot, p)) || tracked.has(p));
      if (!targets.length) return 'không có thay đổi để commit';

      await git(kbRoot, ['add', '-A', '--', ...targets]);
      const staged = await git(kbRoot, ['diff', '--cached', '--name-only', '--', ...targets]);
      if (!staged) return 'không có thay đổi để commit';
      await git(kbRoot, ['commit', '--no-verify', '-m', message, '--', ...targets]);
      if (!push) return `đã commit "${message}" (chưa push — chạy git push trong team-ai-knowledge)`;
      try {
        await git(kbRoot, ['pull', '--rebase', '--autostash']);
        await git(kbRoot, ['push']);
        return `đã commit + push "${message}"`;
      } catch (err: any) {
        return `đã commit nhưng push lỗi: ${String(err.stderr || err.message).split('\n')[0]}`;
      }
    } catch (err: any) {
      return `git lỗi (file vẫn được lưu): ${String(err.stderr || err.message).split('\n')[0]}`;
    }
  }

  /** @param paths KB-relative file paths */
  return function afterWrite(paths: string[], message: string): Promise<string | null> {
    if (!enabled) return Promise.resolve(null);
    const next = queue.then(() => sync(paths, message));
    queue = next.catch(() => undefined);
    return next;
  };
}
