/**
 * Intent Analyzer Engine — Rule-based analysis for auto_context tool.
 *
 * Analyzes chatContext using keyword matching + scoring system
 * to determine which KB tools to call and with what parameters.
 */

/** Read-only tools the analyzer may call on its own — never a tool that writes or deletes */
export type KBToolName =
  | 'xem_tong_quan'
  | 'xem_ngu_canh_du_an'
  | 'tim_kiem_kien_thuc'
  | 'xem_mau_thiet_ke'
  | 'xem_quyet_dinh'
  | 'xem_bai_hoc'
  | 'danh_sach_phien_gan_day'
  | 'xem_bieu_mau'
  | 'xem_khao_sat'
  | 'xem_dac_ta'
  | 'sep_danh_sach_change';

/** Supported task types */
export type TaskType = 'coding' | 'debug' | 'architecture' | 'general';

/** Result of intent analysis for a single tool */
export interface ToolIntent {
  toolName: KBToolName;
  score: number;
  extractedParams: Record<string, string | number | undefined>;
}

/** Input for the intent analyzer */
export interface AnalyzerInput {
  chatContext: string;
  projectName?: string;
  taskType?: TaskType;
}

/** Keyword definition for a tool */
interface KeywordEntry {
  keywords: string[];
  baseScore: number;
  taskTypeBoost: Partial<Record<TaskType, number>>;
}

/** Stop words to filter out when extracting search queries */
const STOP_WORDS = new Set([
  'toi', 'tôi', 'can', 'cần', 'muon', 'muốn', 'la', 'là', 'the', 'a', 'an',
  'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'this', 'that', 'it', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'how', 'what',
  'when', 'where', 'why', 'who', 'which', 'dang', 'đang', 'da', 'đã',
  'se', 'sẽ', 'nhu', 'như', 'nao', 'nào', 'gi', 'gì', 'cua', 'của',
  'voi', 'với', 'cho', 'biet', 'biết', 'xem', 'hay', 'va', 'và',
  'khong', 'không', 'co', 'có', 'duoc', 'được', 'tai', 'tại',
  'nay', 'này', 'do', 'đó', 'khi', 'thi', 'thì', 'roi', 'rồi',
  'ma', 'mà', 'de', 'để', 'neu', 'nếu', 'bao', 'sao',
]);

/**
 * Keyword map — defines which keywords trigger which tools.
 * Each tool has a set of keywords, a base score per keyword match,
 * and task-type-specific score boosts.
 */
const KEYWORD_MAP: Record<KBToolName, KeywordEntry> = {
  xem_tong_quan: {
    keywords: [
      'overview', 'tong quan', 'tổng quan', 'start', 'bat dau', 'bắt đầu',
      'cau truc', 'cấu trúc', 'structure', 'map', 'ban do', 'bản đồ',
      'navigation', 'dieu huong', 'điều hướng', 'knowledge base', 'kb',
    ],
    baseScore: 3,
    taskTypeBoost: { general: 3 },
  },
  xem_ngu_canh_du_an: {
    keywords: [
      'context', 'ngu canh', 'ngữ cảnh', 'project info', 'du an', 'dự án',
      'tech stack', 'database', 'schema', 'thong tin', 'thông tin',
      'mo ta', 'mô tả', 'project overview',
    ],
    baseScore: 3,
    taskTypeBoost: { general: 2, architecture: 2 },
  },
  tim_kiem_kien_thuc: {
    keywords: [],
    baseScore: 1,
    taskTypeBoost: { general: 1, coding: 1, debug: 1, architecture: 1 },
  },
  xem_mau_thiet_ke: {
    keywords: [
      'pattern', 'convention', 'coding style', 'quy uoc', 'quy ước',
      'cach viet', 'cách viết', 'naming', 'dat ten', 'đặt tên',
      'error handling', 'xu ly loi', 'xử lý lỗi', 'api response',
      'git workflow', 'code style', 'standard', 'chuan', 'chuẩn',
    ],
    baseScore: 3,
    taskTypeBoost: { coding: 3 },
  },
  xem_quyet_dinh: {
    keywords: [
      'decision', 'adr', 'quyet dinh', 'quyết định', 'kien truc', 'kiến trúc',
      'architecture', 'why', 'tai sao', 'tại sao', 'ly do', 'lý do',
      'chon', 'chọn', 'thiet ke', 'thiết kế', 'design',
    ],
    baseScore: 3,
    taskTypeBoost: { architecture: 5 },
  },
  xem_bai_hoc: {
    keywords: [
      'bug', 'loi', 'lỗi', 'error', 'lesson', 'bai hoc', 'bài học',
      'fix', 'debug', 'crash', 'fail', 'failure', 'issue', 'problem',
      'van de', 'vấn đề', 'exception', 'broken', 'hong', 'hỏng',
      'timeout', 'memory leak', 'performance', 'slow', 'cham', 'chậm',
    ],
    baseScore: 3,
    taskTypeBoost: { debug: 5 },
  },
  danh_sach_phien_gan_day: {
    keywords: [
      'recent', 'gan day', 'gần đây', 'tuan qua', 'tuần qua',
      'hom qua', 'hôm qua', 'session', 'ai da lam', 'ai đã làm',
      'history', 'lich su', 'lịch sử', 'last', 'latest', 'moi nhat',
      'mới nhất', 'log', 'activity', 'hoat dong', 'hoạt động',
    ],
    baseScore: 3,
    taskTypeBoost: { general: 2 },
  },
  xem_bieu_mau: {
    keywords: [
      'template', 'bieu mau', 'biểu mẫu', 'form', 'mau', 'mẫu', 'cau truc mau', 'cấu trúc mẫu'
    ],
    baseScore: 4,
    taskTypeBoost: { general: 2, architecture: 2, coding: 2 },
  },
  xem_khao_sat: {
    keywords: [
      'khao sat', 'khảo sát', 'exploration', 'kham pha', 'khám phá', 'discovery'
    ],
    baseScore: 3,
    taskTypeBoost: { architecture: 3, general: 2 },
  },
  xem_dac_ta: {
    keywords: [
      'dac ta', 'đặc tả', 'spec', 'specification', 'requirements', 'yeu cau', 'yêu cầu'
    ],
    baseScore: 3,
    taskTypeBoost: { coding: 3, architecture: 2 },
  },
  sep_danh_sach_change: {
    keywords: [
      'chuc nang', 'chức năng', 'feature', 'change', 'lam tiep', 'làm tiếp', 'tiep tuc', 'tiếp tục',
      'tien do', 'tiến độ', 'buoc tiep theo', 'bước tiếp theo', 'sep', 'openspec', 'task', 'workflow',
      'quy trinh', 'quy trình', 'approve', 'duyet', 'duyệt',
    ],
    baseScore: 3,
    taskTypeBoost: { coding: 2, general: 1 },
  },
};

/** Regex patterns for extracting specific IDs from chatContext */
const ID_PATTERNS: Record<string, RegExp> = {
  patternId: /\b(PAT-\d{3})\b/i,
  decisionId: /\b(ADR-\d{4})\b/i,
  lessonId: /\b(LL-[\w-]+)\b/i,
  explorationId: /\b(EXP-[\w-]+)\b/i,
  specId: /\b(SPEC-[\w-]+)\b/i,
};

/**
 * Removes Vietnamese diacritics from text.
 * @param {string} text - Input text with possible diacritics.
 * @returns {string} Text with diacritics removed.
 */
function removeDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

/**
 * Normalizes text for matching: lowercase, remove diacritics.
 * @param {string} text - Raw input text.
 * @returns {string} Normalized text.
 */
function normalizeText(text: string): string {
  return removeDiacritics(text.toLowerCase().trim());
}

/**
 * Extracts meaningful search query from chatContext by removing stop words.
 * @param {string} text - Raw chat context text.
 * @returns {string} Cleaned search query.
 */
function extractSearchQuery(text: string): string {
  const normalized = normalizeText(text);
  const tokens = normalized.split(/\s+/);
  const meaningful = tokens.filter((t) => t.length > 1 && !STOP_WORDS.has(t));
  return meaningful.slice(0, 8).join(' ');
}

/**
 * Extracts specific IDs (PAT-xxx, ADR-xxxx, LL-xxx) from chatContext.
 * @param {string} text - Raw chat context text.
 * @returns {Record<string, string>} Map of paramName → extracted ID.
 */
function extractIds(text: string): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const [paramName, regex] of Object.entries(ID_PATTERNS)) {
    const match = text.match(regex);
    if (match) {
      ids[paramName] = match[1];
    }
  }
  return ids;
}

/**
 * Calculates the relevance score for a tool based on chatContext.
 * @param {string} normalizedText - Normalized chat context.
 * @param {KBToolName} toolName - Tool to score.
 * @param {TaskType} [taskType] - Optional task type for boosting.
 * @returns {number} Relevance score.
 */
function calculateToolScore(
  normalizedText: string,
  toolName: KBToolName,
  taskType?: TaskType
): number {
  const entry = KEYWORD_MAP[toolName];
  let score = 0;

  // Keyword matching
  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalizedText.includes(normalizedKeyword)) {
      score += entry.baseScore;
    }
  }

  // TaskType boost
  if (taskType && entry.taskTypeBoost[taskType]) {
    score += entry.taskTypeBoost[taskType]!;
  }

  // tim_kiem_kien_thuc always gets base score as fallback
  if (toolName === 'tim_kiem_kien_thuc' && score === 0) {
    score = entry.baseScore;
  }

  return score;
}

/** Scoring threshold — only tools with score >= this value are called */
const SCORE_THRESHOLD = 2;

/** Maximum number of tools to call per auto_context invocation */
const MAX_TOOLS = 4;

/**
 * Analyzes chatContext and returns ranked list of tools to call.
 *
 * @param {AnalyzerInput} input - Chat context, optional project name and task type.
 * @returns {ToolIntent[]} Ranked array of tools to call with their params.
 *
 * @example
 * ```typescript
 * const result = analyzeIntent({
 *   chatContext: 'tôi đang debug lỗi crash khi login',
 *   taskType: 'debug'
 * });
 * // Returns: [{ toolName: 'xem_bai_hoc', score: 8, ... }, ...]
 * ```
 */
export function analyzeIntent(input: AnalyzerInput): ToolIntent[] {
  const { chatContext, projectName, taskType } = input;
  const normalizedText = normalizeText(chatContext);
  const extractedIds = extractIds(chatContext);
  const searchQuery = extractSearchQuery(chatContext);

  const toolNames = Object.keys(KEYWORD_MAP) as KBToolName[];

  const scored: ToolIntent[] = [];

  for (const toolName of toolNames) {
    const score = calculateToolScore(normalizedText, toolName, taskType);

    if (score < SCORE_THRESHOLD) continue;

    const params: Record<string, string | number | undefined> = {};

    // Build params based on tool type
    switch (toolName) {
      case 'xem_ngu_canh_du_an':
        if (projectName) {
          params.projectName = projectName;
        } else {
          continue; // Skip if no project specified
        }
        break;
      case 'tim_kiem_kien_thuc':
        params.query = searchQuery;
        if (projectName) params.projectName = projectName;
        break;
      case 'xem_mau_thiet_ke':
        params.patternId = extractedIds.patternId || searchQuery;
        break;
      case 'xem_quyet_dinh':
        params.decisionId = extractedIds.decisionId || searchQuery;
        break;
      case 'xem_bai_hoc':
        params.lessonId = extractedIds.lessonId || searchQuery;
        break;
      case 'danh_sach_phien_gan_day':
        params.days = 3;
        if (projectName) params.projectName = projectName;
        break;
      case 'xem_bieu_mau': {
        const type = normalizedText.match(/\b(decision|lesson|pattern|session|exploration|spec|review)\b/)?.[1];
        if (!type) continue;
        params.type = type;
        break;
      }
      case 'xem_khao_sat':
        params.explorationId = extractedIds.explorationId || searchQuery;
        break;
      case 'xem_dac_ta':
        params.specId = extractedIds.specId || searchQuery;
        break;
      case 'sep_danh_sach_change':
        params.assignee = '*';
        break;
      // xem_tong_quan has no params
    }

    scored.push({ toolName, score, extractedParams: params });
  }

  // Sort by score descending, take top MAX_TOOLS
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_TOOLS);
}
