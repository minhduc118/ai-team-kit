/** Shared paths + helpers for the `sep` CLI. */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

export const KB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const KIT_DIR = path.join(KB_ROOT, 'sep-kit');
export const MCP_DIR = path.join(KB_ROOT, 'mcp-server');
export const MCP_ENTRY = path.join(MCP_DIR, 'dist', 'index.js');
export const HOOK_SCRIPT = path.join(KIT_DIR, 'hooks', 'sep-hook.js');
export const SERVER_NAME = 'sep';
export const HOME = os.homedir();
export const SEP_HOME = process.env.SEP_HOME || path.join(HOME, '.sep');
export const isWin = process.platform === 'win32';

/** Per-IDE install locations (user scope) */
export const IDE = {
  cursor: {
    label: 'Cursor',
    root: path.join(HOME, '.cursor'),
    skills: path.join(HOME, '.cursor', 'skills'),
    agents: path.join(HOME, '.cursor', 'agents'),
    mcp: path.join(HOME, '.cursor', 'mcp.json'),
    hooks: path.join(HOME, '.cursor', 'hooks.json'),
  },
  claude: {
    label: 'Claude Code',
    root: path.join(HOME, '.claude'),
    skills: path.join(HOME, '.claude', 'skills'),
    agents: path.join(HOME, '.claude', 'agents'),
    settings: path.join(HOME, '.claude', 'settings.json'),
    memory: path.join(HOME, '.claude', 'CLAUDE.md'),
  },
  antigravity: {
    label: 'Antigravity',
    root: path.join(HOME, '.gemini'),
    /** Skills also provide the /sep-* slash commands (workflows are retired on 2026-11-01) */
    skills: path.join(HOME, '.gemini', 'config', 'skills'),
    /** Workflow folders written by older kit versions — cleaned up on install/uninstall */
    legacyWorkflows: [
      path.join(HOME, '.gemini', 'config', 'global_workflows'),
      path.join(HOME, '.gemini', 'config', 'workflows'),
    ],
    rules: path.join(HOME, '.gemini', 'config', 'rules'),
    mcp: path.join(HOME, '.gemini', 'config', 'mcp_config.json'),
    /** Older Antigravity builds read MCP from here — updated only if it already exists */
    legacyMcp: path.join(HOME, '.gemini', 'antigravity', 'mcp_config.json'),
  },
};
export const IDE_KEYS = Object.keys(IDE);

export const ok = msg => console.log(`  ✅ ${msg}`);
export const warn = msg => console.log(`  ⚠️  ${msg}`);
export const info = msg => console.log(`  • ${msg}`);

export function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (const a of argv) {
    if (a.startsWith('--')) {
      const [k, ...rest] = a.slice(2).split('=');
      flags[k] = rest.length ? rest.join('=') : true;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

export function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWin });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} thất bại (exit ${r.status})`);
}

export function tryOutput(cmd, args, cwd) {
  try {
    return execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'ignore'], shell: isWin }).toString().trim();
  } catch {
    return '';
  }
}

/** True when dir is inside a git work tree (the KB may be a subfolder of a larger repo) */
export function isGitWorkTree(dir) {
  return tryOutput('git', ['rev-parse', '--is-inside-work-tree'], dir) === 'true';
}

export function readJson(file) {
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    const backup = `${file}.bak-${Date.now()}`;
    fs.copyFileSync(file, backup);
    warn(`${file} không phải JSON hợp lệ — đã backup sang ${backup}`);
    return {};
  }
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

export function writeText(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();
}

export function listMd(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md').sort();
}

const MARK_START = '<!-- sep-kit:start -->';
const MARK_END = '<!-- sep-kit:end -->';

/** Insert or replace the sep-kit block in a text file; content outside the markers is never touched */
export function upsertBlock(file, body) {
  const block = `${MARK_START}\n${body.trim()}\n${MARK_END}`;
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const re = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`);
  const next = re.test(current) ? current.replace(re, block) : `${current.trimEnd()}${current.trim() ? '\n\n' : ''}${block}\n`;
  writeText(file, next);
}

export function removeBlock(file) {
  if (!fs.existsSync(file)) return false;
  const current = fs.readFileSync(file, 'utf8');
  const re = new RegExp(`\\n*${MARK_START}[\\s\\S]*?${MARK_END}\\n?`);
  if (!re.test(current)) return false;
  fs.writeFileSync(file, current.replace(re, '\n').trimEnd() + '\n');
  return true;
}

/** Import compiled MCP modules (build first if needed) */
export async function loadMcp({ build = true } = {}) {
  if (!fs.existsSync(MCP_ENTRY)) {
    if (!build) throw new Error('mcp-server chưa build. Chạy: npm run sep -- install');
    buildMcp();
  }
  const url = p => new URL(`file:///${path.join(MCP_DIR, 'dist', p).replace(/\\/g, '/')}`).href;
  const [wf, lp] = await Promise.all([import(url('tools/sepWorkflow.js')), import(url('providers/localProvider.js'))]);
  return { ...wf, LocalProvider: lp.LocalProvider };
}

export function buildMcp() {
  if (!fs.existsSync(path.join(MCP_DIR, 'node_modules'))) {
    console.log('📦 Cài dependencies cho mcp-server...');
    run('npm', ['install', '--no-audit', '--no-fund'], MCP_DIR);
  }
  console.log('🔨 Build mcp-server...');
  run('npm', ['run', 'build'], MCP_DIR);
  if (!fs.existsSync(MCP_ENTRY)) throw new Error(`Không thấy ${MCP_ENTRY} sau khi build`);
}
