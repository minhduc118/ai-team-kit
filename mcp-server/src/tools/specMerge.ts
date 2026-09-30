/**
 * Merge a change's delta specs.md into the capability's source spec (openspec/specs/<capability>/spec.md).
 *
 * Delta format (OpenSpec convention):
 *   ## ADDED Requirements      → append (replace if the name already exists)
 *   ## MODIFIED Requirements   → replace the block with the same name (append if missing)
 *   ## REMOVED Requirements    → delete by name (body may be just the heading)
 * Each requirement block starts with "### Requirement: <name>" and runs until the next ### / ## heading.
 */

export const SPECS_DIR = 'openspec/specs';

type DeltaKind = 'added' | 'modified' | 'removed';

export interface MergeResult {
  content: string;
  added: string[];
  modified: string[];
  removed: string[];
  warnings: string[];
}

interface Block {
  name: string;
  text: string;
}

const REQ_HEADING = /^###\s+Requirement:\s*(.+?)\s*$/;

function normName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Split lines into "## " sections: [{ heading, lines }] (heading '' = preamble) */
function sections(md: string): Array<{ heading: string; lines: string[] }> {
  const out: Array<{ heading: string; lines: string[] }> = [{ heading: '', lines: [] }];
  for (const line of md.replace(/\r\n/g, '\n').split('\n')) {
    if (/^##\s+/.test(line) && !/^###/.test(line)) out.push({ heading: line.replace(/^##\s+/, '').trim(), lines: [] });
    else out[out.length - 1].lines.push(line);
  }
  return out;
}

/** Requirement blocks inside a section body */
function blocks(lines: string[]): Block[] {
  const out: Block[] = [];
  let cur: { name: string; lines: string[] } | null = null;
  for (const line of lines) {
    const m = line.match(REQ_HEADING);
    if (m) {
      if (cur) out.push({ name: cur.name, text: cur.lines.join('\n').trim() });
      cur = { name: m[1], lines: [line] };
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  if (cur) out.push({ name: cur.name, text: cur.lines.join('\n').trim() });
  return out;
}

function deltaKind(heading: string): DeltaKind | null {
  const h = heading.toUpperCase();
  if (h.startsWith('ADDED')) return 'added';
  if (h.startsWith('MODIFIED')) return 'modified';
  if (h.startsWith('REMOVED')) return 'removed';
  return null;
}

export function parseDelta(md: string): Record<DeltaKind, Block[]> & { isDelta: boolean } {
  const result = { added: [] as Block[], modified: [] as Block[], removed: [] as Block[], isDelta: false };
  for (const sec of sections(md)) {
    const kind = deltaKind(sec.heading);
    if (!kind) continue;
    result.isDelta = true;
    result[kind].push(...blocks(sec.lines));
  }
  return result;
}

function parseBase(md: string | null): { reqs: Block[]; history: string[] } {
  if (!md) return { reqs: [], history: [] };
  const secs = sections(md);
  const reqSec = secs.find(s => /^requirements\b/i.test(s.heading));
  const histSec = secs.find(s => /^lịch sử(\s|$)/i.test(s.heading));
  return {
    reqs: reqSec ? blocks(reqSec.lines) : [],
    history: histSec ? histSec.lines.filter(l => l.trim().startsWith('- ')) : [],
  };
}

export function mergeDeltaSpec(
  base: string | null,
  delta: string,
  ctx: { capability: string; change: string; date: string },
): MergeResult {
  const { reqs, history } = parseBase(base);
  const parsed = parseDelta(delta);
  const warnings: string[] = [];
  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];
  const index = (name: string) => reqs.findIndex(r => normName(r.name) === normName(name));

  if (!parsed.isDelta) {
    const loose = blocks(sections(delta).flatMap(s => s.lines));
    if (loose.length > 0) {
      parsed.added = loose;
      warnings.push('specs.md không có mục "## ADDED/MODIFIED/REMOVED Requirements" — coi mọi "### Requirement:" là ADDED.');
    } else {
      const body = delta.replace(/^---[\s\S]*?\n---\n/, '').replace(/^#\s+.*\n/, '').trim();
      parsed.added = [{ name: `${ctx.change} (toàn bộ specs)`, text: `### Requirement: ${ctx.change} (toàn bộ specs)\n\n${body}` }];
      warnings.push('specs.md không có "### Requirement:" nào — đã chèn nguyên khối. Nên viết specs theo định dạng delta.');
    }
  }

  for (const b of parsed.added) {
    const i = index(b.name);
    if (i >= 0) {
      reqs[i] = b;
      warnings.push(`ADDED "${b.name}" đã tồn tại trong spec gốc — đã thay thế.`);
    } else {
      reqs.push(b);
    }
    added.push(b.name);
  }
  for (const b of parsed.modified) {
    const i = index(b.name);
    if (i >= 0) {
      reqs[i] = b;
    } else {
      reqs.push(b);
      warnings.push(`MODIFIED "${b.name}" không có trong spec gốc — đã thêm mới.`);
    }
    modified.push(b.name);
  }
  for (const b of parsed.removed) {
    const i = index(b.name);
    if (i >= 0) reqs.splice(i, 1);
    else warnings.push(`REMOVED "${b.name}" không có trong spec gốc — bỏ qua.`);
    removed.push(b.name);
  }

  const historyLine = `- ${ctx.date} · \`${ctx.change}\` · +${added.length} ~${modified.length} -${removed.length}`;
  const content = [
    `# Spec: ${ctx.capability}`,
    '',
    '> Spec gốc của capability. Chỉ cập nhật qua `/sep-archive` (merge delta từ `openspec/changes/<change>/specs.md`).',
    '',
    '## Requirements',
    '',
    reqs.length ? reqs.map(r => r.text).join('\n\n') : '_(chưa có requirement)_',
    '',
    '## Lịch sử',
    ...history,
    historyLine,
    '',
  ].join('\n');

  return { content, added, modified, removed, warnings };
}
