/**
 * Tool Handlers — Extracted handler functions for each KB tool.
 *
 * Uses DataProvider abstraction so handlers work with both
 * local filesystem and GitHub API transparently.
 */

import matter from 'gray-matter';
import { safeRelPath, type DataProvider, type ParsedMarkdown } from '../providers/dataProvider.js';

const KIND_PATHS = {
  pattern: /^(_global|projects\/[^/]+)\/patterns\//,
  decision: /^(_global|projects\/[^/]+)\/decisions\//,
  lesson: /^(_global|projects\/[^/]+)\/lessons\//,
  exploration: /^(openspec\/changes\/[^/]+\/exploration\.md|projects\/[^/]+\/explorations\/)/,
  spec: /^(openspec\/specs\/|openspec\/changes\/[^/]+\/specs\.md)/,
};
const SESSION_PATH = /^projects\/([^/]+)\/sessions\/[^/]+\.md$/;
const PROJECT_NAME = /^[\p{L}\p{N}][\p{L}\p{N}._ ()-]*$/u;

export interface ToolHandlerOptions {
  /** Written as `author` in generated docs (default: AI-Agent) */
  author?: string;
  /** Called after files are written/deleted (git commit in local mode). Paths are KB-relative. */
  afterWrite?: (files: string[], message: string) => Promise<string | null>;
}

/** Rejects project names that could change the target folder (`../x`, `a/b`) */
export function assertProjectName(projectName: string): string {
  const name = String(projectName ?? '').trim();
  if (!PROJECT_NAME.test(name) || name.includes('..')) {
    throw new Error(`Tên dự án không hợp lệ: "${projectName}" — chỉ gồm chữ, số, dấu cách và . _ - ( )`);
  }
  return name;
}

/** Only markdown knowledge docs under _global/ or projects/ may be archived or restored */
function assertKnowledgeDoc(p: string): string {
  const rel = safeRelPath(p);
  if (!/^(_global|projects\/[^/]+)\/.+\.md$/.test(rel)) {
    throw new Error(`Chỉ lưu trữ/khôi phục được file .md trong _global/ hoặc projects/<dự án>/ (nhận: ${p})`);
  }
  return rel;
}

/**
 * Factory that creates all tool handler functions bound to a DataProvider.
 * @param provider - DataProvider instance (LocalProvider or GitHubProvider).
 * @returns Object containing all handler functions.
 */
export function createToolHandlers(provider: DataProvider, options: ToolHandlerOptions = {}) {
  const author = options.author?.trim() || 'AI-Agent';

  /** Writes a generated markdown doc and commits it; returns the reply suffix */
  async function saveDoc(
    targetPath: string,
    frontmatter: Record<string, unknown>,
    body: string,
    message: string,
  ): Promise<{ path: string; git: string }> {
    let finalPath = targetPath;
    for (let n = 2; await provider.fileExists(finalPath); n++) {
      finalPath = targetPath.replace(/\.md$/, `-${n}.md`);
    }
    await provider.writeFile(finalPath, matter.stringify(`\n${body.trim()}\n`, frontmatter), { message });
    const git = await options.afterWrite?.([finalPath], message);
    return { path: finalPath, git: git ? `\n🔀 ${git}` : '' };
  }

  /** Moves a doc (write new + delete old) and commits both paths */
  async function moveDoc(from: string, to: string, doc: ParsedMarkdown, message: string): Promise<string> {
    if (await provider.fileExists(to)) throw new Error(`Đích đã có file: ${to}`);
    await provider.writeFile(to, matter.stringify(doc.content, doc.frontmatter), { message });
    await provider.deleteFile(from, { message });
    const git = await options.afterWrite?.([to, from], message);
    return git ? `\n🔀 ${git}` : '';
  }

  const today = () => new Date().toISOString().split('T')[0];
  const shortId = () => Math.floor(100 + Math.random() * 900);

  /**
   * Reads and parses a markdown file safely.
   * @param relativePath - Relative path from KB root.
   * @returns Parsed frontmatter + content, or null if not found.
   */
  async function readMarkdown(relativePath: string): Promise<ParsedMarkdown | null> {
    try {
      const raw = await provider.readFile(relativePath);
      if (!raw) return null;
      const { data: frontmatter, content } = matter(raw);
      return { frontmatter, content };
    } catch (error: any) {
      console.error(`[readMarkdown] Error reading ${relativePath}:`, error.message);
      return null;
    }
  }

  /**
   * Searches markdown files by keyword within KB.
   * @param query - Search term.
   * @param projectName - Optional project filter.
   * @returns Matching file summaries.
   */
  async function searchMarkdownFiles(
    query: string,
    projectName?: string,
    pathFilter?: RegExp
  ): Promise<Array<{ path: string; title: string; snippet: string }>> {
    const results: Array<{ path: string; title: string; snippet: string }> = [];
    const searchDir = projectName ? `projects/${assertProjectName(projectName)}` : '';

    const files = (await provider.listFiles(searchDir, '*.md'))
      .map(f => f.replace(/\\/g, '/'))
      .filter(f => !pathFilter || pathFilter.test(f));
    const queryLower = query.toLowerCase();

    for (const filePath of files) {
      const doc = await readMarkdown(filePath);
      if (!doc) continue;

      const fullText = (
        filePath + ' ' + JSON.stringify(doc.frontmatter) + ' ' + doc.content
      ).toLowerCase();

      if (fullText.includes(queryLower)) {
        const baseName = filePath.split('/').pop() || filePath;
        const title = doc.frontmatter.title || baseName.replace('.md', '');
        const snippet = doc.content.slice(0, 200).replace(/\n/g, ' ') + '...';
        results.push({ path: filePath, title, snippet });
      }
    }

    return results;
  }

  /** Searches one document kind; falls back to the whole KB when the kind's folders have no match */
  async function searchKind(query: string, kind: keyof typeof KIND_PATHS): Promise<string> {
    const matches = await searchMarkdownFiles(query, undefined, KIND_PATHS[kind]);
    if (matches.length) return JSON.stringify(matches, null, 2);
    const loose = await searchMarkdownFiles(query);
    return loose.length
      ? `Không có ${kind} khớp '${query}' — kết quả tìm trong toàn KB:\n${JSON.stringify(loose, null, 2)}`
      : `No matches found for '${query}'.`;
  }

  /**
   * Handles xem_tong_quan — returns KB overview and navigation map.
   * @returns Overview content string.
   */
  async function handleXemTongQuan(): Promise<string> {
    const mapDoc = await readMarkdown('KNOWLEDGE_MAP.md');
    const startDoc = await readMarkdown('START_HERE.md');
    return `# Overview\n\n${startDoc?.content || 'START_HERE.md not found.'}\n\n# Navigation Map\n\n${mapDoc?.content || 'KNOWLEDGE_MAP.md not found.'}`;
  }

  /**
   * Handles xem_ngu_canh_du_an — returns project context/overview.
   * @param projectName - Target project name.
   * @returns Project context content.
   */
  async function handleXemNguCanhDuAn(projectName: string): Promise<string> {
    const doc = await readMarkdown(`projects/${assertProjectName(projectName)}/context/overview.md`);
    if (!doc) {
      return `Project '${projectName}' context not found.`;
    }
    return `# Context: ${projectName}\n\n${doc.content}`;
  }

  /**
   * Handles tim_kiem_kien_thuc — searches KB by query string.
   * @param query - Keyword query.
   * @param projectName - Optional project filter.
   * @returns JSON stringified results.
   */
  async function handleTimKiemKienThuc(
    query: string,
    projectName?: string
  ): Promise<string> {
    const matches = await searchMarkdownFiles(query, projectName);
    return matches.length
      ? JSON.stringify(matches, null, 2)
      : `No matches found for '${query}'.`;
  }

  /**
   * Handles xem_mau_thiet_ke — fetches design pattern by ID or query.
   * @param patternId - Pattern ID or search query.
   * @returns JSON stringified results.
   */
  async function handleXemMauThietKe(patternId: string): Promise<string> {
    return searchKind(patternId, 'pattern');
  }

  /**
   * Handles xem_quyet_dinh — fetches ADR by ID or query.
   * @param decisionId - ADR ID or search query.
   * @returns JSON stringified results.
   */
  async function handleXemQuyetDinh(decisionId: string): Promise<string> {
    return searchKind(decisionId, 'decision');
  }

  /**
   * Handles xem_bai_hoc — fetches lesson learned by ID or query.
   * @param lessonId - Lesson ID or search query.
   * @returns JSON stringified results.
   */
  async function handleXemBaiHoc(lessonId: string): Promise<string> {
    return searchKind(lessonId, 'lesson');
  }

  /**
   * Handles danh_sach_phien_gan_day — lists session summaries from the last N days.
   * @param days - Number of recent days (default 3). With no session in range, returns the 5 latest.
   * @param projectName - Optional project filter.
   * @returns JSON stringified results, newest first.
   */
  async function handleDanhSachPhienGanDay(
    days = 3,
    projectName?: string
  ): Promise<string> {
    const files = (await provider.listFiles(projectName ? `projects/${assertProjectName(projectName)}` : 'projects', '*.md'))
      .map(f => f.replace(/\\/g, '/'))
      .filter(f => SESSION_PATH.test(f));

    const sessions: Array<{ path: string; project: string; date: string; title: string; snippet: string }> = [];
    for (const filePath of files) {
      const doc = await readMarkdown(filePath);
      if (!doc) continue;
      const fileName = filePath.split('/').pop()!;
      const date = String(doc.frontmatter.date ?? fileName.slice(0, 10)).slice(0, 10);
      const title = doc.content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fileName.replace(/\.md$/, '');
      sessions.push({
        path: filePath,
        project: filePath.match(SESSION_PATH)![1],
        date,
        title,
        snippet: doc.content.replace(/^#.*$/gm, '').trim().slice(0, 200).replace(/\n/g, ' '),
      });
    }
    sessions.sort((a, b) => b.date.localeCompare(a.date));

    const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    const recent = sessions.filter(s => s.date >= since);
    if (recent.length) return JSON.stringify(recent, null, 2);
    if (!sessions.length) return `Chưa có phiên làm việc nào${projectName ? ` cho ${projectName}` : ''}.`;
    return `Không có phiên nào trong ${days} ngày gần đây — 5 phiên mới nhất:\n${JSON.stringify(sessions.slice(0, 5), null, 2)}`;
  }

  function toSlug(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Handles luu_phien_lam_viec — saves a new session summary.
   * @param params - Session data.
   * @returns Success message with file path.
   */
  async function handleLuuPhienLamViec(params: {
    projectName: string;
    title: string;
    goals: string[];
    filesChanged?: string[];
    summary: string;
  }): Promise<string> {
    const { title, goals, filesChanged, summary } = params;
    const projectName = assertProjectName(params.projectName);

    const date = today();
    const saved = await saveDoc(
      `projects/${projectName}/sessions/${date}-${toSlug(title) || 'session'}.md`,
      {
        id: `SES-${date}-${shortId()}`,
        date,
        author,
        project: projectName,
        goals,
        status: 'completed',
        files_changed: filesChanged ?? [],
        tags: ['session', 'summary'],
      },
      `# Session Summary: ${title}\n\n${summary}`,
      `kb(${projectName}): session ${title}`,
    );
    return `✅ Session summary successfully saved to: ${saved.path}${saved.git}`;
  }

  /**
   * Handles luu_bai_hoc — saves a new lesson learned.
   * @param params - Lesson data.
   * @returns Success message with file path.
   */
  async function handleLuuBaiHoc(params: {
    title: string;
    scope: string;
    severity: string;
    resolution: string;
    problem: string;
    solution: string;
  }): Promise<string> {
    const { title, scope, severity, resolution, problem, solution } = params;

    const date = today();
    const lessonId = `LL-${date}-${shortId()}`;
    const saved = await saveDoc(
      `_global/lessons/${lessonId}-${toSlug(title) || 'lesson'}.md`,
      {
        id: lessonId,
        title,
        date,
        author,
        scope,
        severity,
        resolution,
        tags: ['lesson', 'agent-generated'],
      },
      `# ${lessonId}: ${title}\n\n## Problem\n${problem}\n\n## Solution\n${solution}`,
      `kb: lesson ${lessonId} ${title}`,
    );
    return `✅ Lesson learned successfully saved to: ${saved.path}${saved.git}`;
  }

  /**
   * Helper to determine archive path.
   */
  function getArchivePath(originalPath: string): string {
    if (originalPath.startsWith('projects/')) {
      const parts = originalPath.split('/');
      if (parts[2] !== 'archive') {
        parts.splice(2, 0, 'archive');
        return parts.join('/');
      }
    } else if (originalPath.startsWith('_global/')) {
      const parts = originalPath.split('/');
      if (parts[1] !== 'archive') {
        parts.splice(1, 0, 'archive');
        return parts.join('/');
      }
    }
    return originalPath;
  }

  /**
   * Helper to determine restore path.
   */
  function getRestorePath(archivePath: string): string {
    return archivePath.replace('/archive/', '/');
  }

  /**
   * Handles luu_tru_kien_thuc — archives a KB file.
   * @param path - Path to file.
   * @param reason - Optional reason for archiving.
   * @returns Success message.
   */
  async function handleLuuTruKienThuc(path: string, reason?: string): Promise<string> {
    const rel = assertKnowledgeDoc(path);
    const doc = await readMarkdown(rel);
    if (!doc) return `Error: File not found at ${rel}`;

    doc.frontmatter.status = 'archived';
    doc.frontmatter.superseded = true;
    if (reason) doc.frontmatter.archive_reason = reason;

    const newPath = getArchivePath(rel);
    if (newPath === rel) return `Error: ${rel} đã nằm trong archive.`;

    const git = await moveDoc(rel, newPath, doc, `kb: archive ${rel}`);
    return `✅ Successfully archived to: ${newPath}${git}`;
  }

  /**
   * Handles phuc_hoi_kien_thuc — restores an archived KB file.
   * @param path - Path to archived file.
   * @returns Success message.
   */
  async function handlePhucHoiKienThuc(path: string): Promise<string> {
    const rel = assertKnowledgeDoc(path);
    const doc = await readMarkdown(rel);
    if (!doc) return `Error: File not found at ${rel}`;

    doc.frontmatter.status = 'active';
    delete doc.frontmatter.superseded;
    delete doc.frontmatter.archive_reason;

    const newPath = getRestorePath(rel);
    if (newPath === rel) return `Error: File does not appear to be in an archive path.`;

    const git = await moveDoc(rel, newPath, doc, `kb: restore ${newPath}`);
    return `✅ Successfully restored to: ${newPath}${git}`;
  }

  /**
   * Handles xem_bieu_mau — returns a template content.
   * @param type - Template type (pattern, decision, lesson, session).
   * @returns Template content string.
   */
  async function handleXemBieuMau(type: string): Promise<string> {
    const safeType = toSlug(type);
    const doc = await readMarkdown(`_global/templates/${safeType}.md`);
    if (!doc) {
      const available = (await provider.listFiles('_global/templates', '*.md'))
        .map(f => f.split('/').pop()!.replace(/\.md$/, ''))
        .sort();
      return `Template '${safeType}' not found. Available templates: ${available.join(', ')}.`;
    }
    return `# Template: ${type}\n\n${doc.content}`;
  }
  /**
   * Handles xem_khao_sat — fetches exploration doc by ID or query.
   * @param explorationId - Exploration ID or search query.
   * @returns JSON stringified results.
   */
  async function handleXemKhaoSat(explorationId: string): Promise<string> {
    return searchKind(explorationId, 'exploration');
  }

  /**
   * Handles xem_dac_ta — fetches spec by ID or query.
   * @param specId - Spec ID or search query.
   * @returns JSON stringified results.
   */
  async function handleXemDacTa(specId: string): Promise<string> {
    return searchKind(specId, 'spec');
  }

  /**
   * Handles luu_danh_gia — saves a new verification review.
   * @param params - Review data.
   * @returns Success message with file path.
   */
  async function handleLuuDanhGia(params: {
    projectName: string;
    title: string;
    completeness: string;
    correctness: string;
    coherence: string;
    constraints: string;
    blastRadius: string;
    summary: string;
  }): Promise<string> {
    const { title, completeness, correctness, coherence, constraints, blastRadius, summary } = params;
    const projectName = assertProjectName(params.projectName);
    const cell = (v: string) => String(v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

    const date = today();
    const saved = await saveDoc(
      `projects/${projectName}/reviews/${date}-${toSlug(title) || 'review'}.md`,
      {
        id: `REV-${date}-${shortId()}`,
        date,
        author,
        project: projectName,
        tags: ['review', 'verification'],
      },
      [
        `# Verification Report: ${title}`,
        '',
        '## 5-Dimension Assessment',
        '| Dimension | Status |',
        '|-----------|--------|',
        `| D1: Completeness | ${cell(completeness)} |`,
        `| D2: Correctness | ${cell(correctness)} |`,
        `| D3: Coherence | ${cell(coherence)} |`,
        `| D4: Constraints | ${cell(constraints)} |`,
        `| D5: Blast Radius | ${cell(blastRadius)} |`,
        '',
        '## Summary',
        summary,
      ].join('\n'),
      `kb(${projectName}): review ${title}`,
    );
    return `✅ Verification report successfully saved to: ${saved.path}${saved.git}`;
  }

  return {
    readMarkdown,
    searchMarkdownFiles,
    handleXemTongQuan,
    handleXemNguCanhDuAn,
    handleTimKiemKienThuc,
    handleXemMauThietKe,
    handleXemQuyetDinh,
    handleXemBaiHoc,
    handleDanhSachPhienGanDay,
    handleLuuPhienLamViec,
    handleLuuBaiHoc,
    handleLuuTruKienThuc,
    handlePhucHoiKienThuc,
    handleXemBieuMau,
    handleXemKhaoSat,
    handleXemDacTa,
    handleLuuDanhGia,
  };
}

/** Type helper for the handlers object */
export type ToolHandlers = ReturnType<typeof createToolHandlers>;
