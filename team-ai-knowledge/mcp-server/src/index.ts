/**
 * MCP Server Entry Point — Dual-mode: stdio (local) + HTTP (remote).
 *
 * Auto-detects mode based on environment variables:
 * - GITHUB_TOKEN present → HTTP mode + GitHubProvider
 * - Otherwise → stdio mode + LocalProvider
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';

import { LocalProvider } from './providers/localProvider.js';
import { GitHubProvider } from './providers/gitHubProvider.js';
import { withAuthor, type DataProvider } from './providers/dataProvider.js';
import { createToolHandlers, type ToolHandlers } from './tools/toolHandlers.js';
import { validateArgs, type ToolInputSchema } from './tools/argValidation.js';
import { loadSepPrompts, PROMPT_ARGUMENTS, renderPrompt } from './tools/sepPrompts.js';
import { authenticate, loadAuthConfig, type AuthConfig } from './tools/httpAuth.js';
import { analyzeIntent, type TaskType, type ToolIntent } from './tools/intentAnalyzer.js';
import {
  createSepWorkflow,
  SEP_TOOL_DEFINITIONS,
  type Decision,
  type LifecycleStatus,
  type SchemaKey,
  type SepMode,
  type SepWorkflow,
  type StepKey,
} from './tools/sepWorkflow.js';
import { createGitSync } from './tools/gitSync.js';
import { createActiveStore, logTelemetry } from './tools/localState.js';

const SERVER_VERSION = '2.2.0';

/**
 * Detects which mode to run based on env variables.
 * @returns 'http' if GitHub credentials found, 'stdio' otherwise.
 */
function detectMode(): 'http' | 'stdio' {
  return process.env.GITHUB_TOKEN ? 'http' : 'stdio';
}

/**
 * Creates the appropriate DataProvider based on mode.
 * @param mode - 'http' or 'stdio'.
 * @returns DataProvider instance.
 */
function createProvider(mode: 'http' | 'stdio'): DataProvider {
  if (mode === 'http') {
    const token = process.env.GITHUB_TOKEN!;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';

    if (!owner || !repo) {
      throw new Error('GITHUB_OWNER and GITHUB_REPO are required in HTTP mode');
    }

    return new GitHubProvider({ token, owner, repo, branch });
  }

  return new LocalProvider(localKbRoot());
}

function localKbRoot(): string {
  return path.resolve(process.env.KB_ROOT || path.join(import.meta.dirname, '..', '..'));
}

/**
 * Tool definitions for MCP ListTools (annotations are added in TOOLS below).
 */
const BASE_TOOL_DEFINITIONS = [
  {
    name: 'xem_tong_quan',
    description: 'La bàn: Đọc khi bắt đầu phiên để lấy bản đồ KB (START_HERE.md, KNOWLEDGE_MAP.md).',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'xem_ngu_canh_du_an',
    description: 'Nền tảng: Lấy thông tin chung của dự án để hiểu bối cảnh trước khi code.',
    inputSchema: {
      type: 'object' as const,
      properties: { projectName: { type: 'string', description: 'Tên dự án cần lấy thông tin' } },
      required: ['projectName'],
    },
  },
  {
    name: 'tim_kiem_kien_thuc',
    description: 'Thám tử: Tìm kiếm tự do trong toàn bộ KB bằng từ khóa khi không biết chính xác ID tài liệu.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Từ khóa tìm kiếm' },
        projectName: { type: 'string', description: 'Bộ lọc theo dự án (tùy chọn)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'xem_mau_thiet_ke',
    description: 'Kiểm soát viên: Lấy quy tắc code/convention (Pattern) bắt buộc phải tuân theo trước khi viết code.',
    inputSchema: {
      type: 'object' as const,
      properties: { patternId: { type: 'string', description: 'ID của Pattern (VD: PAT-001) hoặc từ khóa' } },
      required: ['patternId'],
    },
  },
  {
    name: 'xem_quyet_dinh',
    description: 'Sử gia: Lấy lịch sử quyết định kiến trúc (ADR) để hiểu lý do tại sao hệ thống được thiết kế như vậy.',
    inputSchema: {
      type: 'object' as const,
      properties: { decisionId: { type: 'string', description: 'ID của ADR (VD: ADR-0001) hoặc từ khóa' } },
      required: ['decisionId'],
    },
  },
  {
    name: 'xem_bai_hoc',
    description: 'Cứu thương: Lấy bài học (Lessons) để tìm giải pháp cho lỗi/bug đang gặp phải.',
    inputSchema: {
      type: 'object' as const,
      properties: { lessonId: { type: 'string', description: 'ID của bài học hoặc từ khóa' } },
      required: ['lessonId'],
    },
  },
  {
    name: 'danh_sach_phien_gan_day',
    description: 'Báo cáo viên: Xem team vừa làm gì gần đây để bắt nhịp tiến độ.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'Số ngày gần đây (mặc định: 3)' },
        projectName: { type: 'string', description: 'Lọc theo dự án (tùy chọn)' },
      },
    },
  },
  {
    name: 'luu_phien_lam_viec',
    description: 'Thư ký: Tổng kết những gì đã làm, thay đổi file nào khi kết thúc phiên.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectName: { type: 'string', description: 'Tên dự án' },
        title: { type: 'string', description: 'Tiêu đề ngắn gọn cho phiên' },
        goals: { type: 'array', items: { type: 'string' }, description: 'Mục tiêu ban đầu của phiên' },
        filesChanged: { type: 'array', items: { type: 'string' }, description: 'Danh sách các file bị thay đổi' },
        summary: { type: 'string', description: 'Nội dung tóm tắt chi tiết của phiên' },
      },
      required: ['projectName', 'title', 'goals', 'summary'],
    },
  },
  {
    name: 'luu_bai_hoc',
    description: 'Giáo viên: Lưu lại nguyên nhân và cách giải quyết khi sửa xong một lỗi khó.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Tiêu đề của bài học' },
        scope: { type: 'string', description: 'Phạm vi (VD: backend, frontend, devops)' },
        severity: { type: 'string', description: 'Mức độ (VD: low, medium, high, critical)' },
        resolution: { type: 'string', description: 'Tình trạng giải quyết (VD: resolved, workaround)' },
        problem: { type: 'string', description: 'Mô tả vấn đề/lỗi' },
        solution: { type: 'string', description: 'Giải pháp khắc phục chi tiết' },
      },
      required: ['title', 'scope', 'severity', 'resolution', 'problem', 'solution'],
    },
  },
  {
    name: 'luu_tru_kien_thuc',
    description: 'Thủ thư: Chuyển tài liệu cũ (đã bị thay thế) vào thư mục archive để tránh nhầm lẫn.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Đường dẫn tương đối của file cần lưu trữ' },
        reason: { type: 'string', description: 'Lý do lưu trữ (tùy chọn)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'phuc_hoi_kien_thuc',
    description: 'Thủ thư: Khôi phục tài liệu từ archive về vị trí gốc nếu cần thiết.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Đường dẫn tương đối của file trong archive' },
      },
      required: ['path'],
    },
  },
  {
    name: 'xem_bieu_mau',
    description: 'Quản lý quy trình: Lấy cấu trúc chuẩn (Template) trước khi tạo một tài liệu mới (Decision, Lesson, Spec, Pattern).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', description: 'Loại tài liệu cần lấy mẫu (VD: decision, lesson, pattern, session, exploration, spec, review)' },
      },
      required: ['type'],
    },
  },
  {
    name: 'xem_khao_sat',
    description: 'Nhà phân tích: Lấy tài liệu khám phá (Exploration) của một vấn đề trước khi bắt đầu giải quyết.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        explorationId: { type: 'string', description: 'Tên hoặc ID của tài liệu khảo sát' },
      },
      required: ['explorationId'],
    },
  },
  {
    name: 'xem_dac_ta',
    description: 'Kiểm toán viên: Lấy yêu cầu chi tiết (Specs) để code đúng theo mô tả.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        specId: { type: 'string', description: 'Tên hoặc ID của đặc tả' },
      },
      required: ['specId'],
    },
  },
  {
    name: 'luu_danh_gia',
    description: 'Thanh tra (QA): Lưu báo cáo đánh giá chất lượng thay đổi dựa trên 5 tiêu chí D1-D5.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectName: { type: 'string', description: 'Tên dự án' },
        title: { type: 'string', description: 'Tiêu đề đánh giá' },
        completeness: { type: 'string', description: 'Đánh giá D1 (PASS/WARNING/CRITICAL)' },
        correctness: { type: 'string', description: 'Đánh giá D2' },
        coherence: { type: 'string', description: 'Đánh giá D3' },
        constraints: { type: 'string', description: 'Đánh giá D4' },
        blastRadius: { type: 'string', description: 'Đánh giá D5' },
        summary: { type: 'string', description: 'Tổng kết đánh giá chi tiết' },
      },
      required: ['projectName', 'title', 'completeness', 'correctness', 'coherence', 'constraints', 'blastRadius', 'summary'],
    },
  },
  {
    name: 'phan_tich_ngu_canh_tu_dong',
    description:
      'Điều phối viên: Tự động phân tích lịch sử chat và gọi ngầm các tool phù hợp. ' +
      'Trả về kết quả tổng hợp từ nhiều tool KB dựa trên ý định.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        chatContext: {
          type: 'string',
          description: 'Tóm tắt nội dung lịch sử chat hoặc văn bản thô để phân tích',
        },
        projectName: {
          type: 'string',
          description: 'Tên dự án (tùy chọn)',
        },
        taskType: {
          type: 'string',
          enum: ['coding', 'debug', 'architecture', 'general'],
          description: 'Gợi ý loại công việc để chọn tool chính xác hơn',
        },
      },
      required: ['chatContext'],
    },
  },
  ...SEP_TOOL_DEFINITIONS,
];

/** read = no side effects · write = creates/updates files · destructive = moves/deletes or is irreversible */
const TOOL_KIND: Record<string, 'read' | 'write' | 'destructive'> = {
  luu_phien_lam_viec: 'write',
  luu_bai_hoc: 'write',
  luu_danh_gia: 'write',
  luu_tru_kien_thuc: 'destructive',
  phuc_hoi_kien_thuc: 'destructive',
  sep_tao_change: 'write',
  sep_luu_artifact: 'write',
  sep_chon_change: 'write',
  sep_duyet_buoc: 'write',
  sep_chuyen_trang_thai: 'destructive',
};
const IDEMPOTENT = new Set(['sep_luu_artifact', 'sep_chon_change']);

const TOOLS = BASE_TOOL_DEFINITIONS.map(t => {
  const kind = TOOL_KIND[t.name] ?? 'read';
  return {
    ...t,
    annotations: {
      title: t.name,
      readOnlyHint: kind === 'read',
      destructiveHint: kind === 'destructive',
      idempotentHint: kind === 'read' || IDEMPOTENT.has(t.name),
      openWorldHint: false,
    },
  };
});
const TOOL_BY_NAME = new Map(TOOLS.map(t => [t.name, t]));

interface RequestContext {
  provider: DataProvider;
  handlers: ToolHandlers;
  sep: SepWorkflow;
  /** GitHub username of the caller (stdio: SEP_ASSIGNEE, HTTP: from the auth token) */
  user?: string;
  telemetry: boolean;
}

const promptsEnabled = () => process.env.SEP_PROMPTS !== 'false';

/**
 * Registers MCP request handlers on the server.
 */
function registerHandlers(server: Server, ctx: RequestContext): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const started = Date.now();
    const result = await callTool(name, args, ctx);
    if (ctx.telemetry && name.startsWith('sep_')) {
      const a = (args ?? {}) as Record<string, unknown>;
      logTelemetry({
        source: 'mcp',
        event: 'tool',
        tool: name,
        change: typeof a.tenChange === 'string' ? a.tenChange : undefined,
        ok: !('isError' in result && result.isError),
        ms: Date.now() - started,
        user: ctx.user,
      });
    }
    return result;
  });

  if (!promptsEnabled()) return;

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: (await loadSepPrompts(ctx.provider)).map(p => ({
      name: p.name,
      description: p.description,
      arguments: PROMPT_ARGUMENTS,
    })),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: promptArgs } = request.params;
    const prompt = (await loadSepPrompts(ctx.provider)).find(p => p.name === name);
    if (!prompt) throw new Error(`Không có prompt "${name}"`);
    return {
      description: prompt.description,
      messages: [{ role: 'user' as const, content: { type: 'text' as const, text: renderPrompt(prompt, promptArgs?.input) } }],
    };
  });
}

function toolError(name: string, message: string) {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: `Error executing tool '${name}': ${message}` }],
  };
}

async function callTool(name: string, rawArgs: Record<string, unknown> | undefined, ctx: RequestContext) {
  const { handlers, sep } = ctx;
  const def = TOOL_BY_NAME.get(name);
  if (!def) return toolError(name, `Unknown tool. Có sẵn: ${[...TOOL_BY_NAME.keys()].join(', ')}`);
  const checked = validateArgs(def.inputSchema as ToolInputSchema, rawArgs);
  if (!checked.ok) return toolError(name, `tham số không hợp lệ — ${checked.errors.join('; ')}`);
  const args = checked.args;
    try {
      switch (name) {
        case 'xem_tong_quan':
          return { content: [{ type: 'text' as const, text: await handlers.handleXemTongQuan() }] };

        case 'xem_ngu_canh_du_an': {
          const { projectName } = args as { projectName: string };
          return { content: [{ type: 'text' as const, text: await handlers.handleXemNguCanhDuAn(projectName) }] };
        }

        case 'tim_kiem_kien_thuc': {
          const { query, projectName } = args as { query: string; projectName?: string };
          return { content: [{ type: 'text' as const, text: await handlers.handleTimKiemKienThuc(query, projectName) }] };
        }

        case 'xem_mau_thiet_ke': {
          const { patternId } = args as { patternId: string };
          return { content: [{ type: 'text' as const, text: await handlers.handleXemMauThietKe(patternId) }] };
        }

        case 'xem_quyet_dinh': {
          const { decisionId } = args as { decisionId: string };
          return { content: [{ type: 'text' as const, text: await handlers.handleXemQuyetDinh(decisionId) }] };
        }

        case 'xem_bai_hoc': {
          const { lessonId } = args as { lessonId: string };
          return { content: [{ type: 'text' as const, text: await handlers.handleXemBaiHoc(lessonId) }] };
        }

        case 'danh_sach_phien_gan_day': {
          const { days, projectName } = (args ?? {}) as { days?: number; projectName?: string };
          return { content: [{ type: 'text' as const, text: await handlers.handleDanhSachPhienGanDay(days, projectName) }] };
        }

        case 'luu_phien_lam_viec': {
          const sessionParams = args as {
            projectName: string;
            title: string;
            goals: string[];
            filesChanged?: string[];
            summary: string;
          };
          return { content: [{ type: 'text' as const, text: await handlers.handleLuuPhienLamViec(sessionParams) }] };
        }

        case 'luu_bai_hoc': {
          const lessonParams = args as {
            title: string;
            scope: string;
            severity: string;
            resolution: string;
            problem: string;
            solution: string;
          };
          return { content: [{ type: 'text' as const, text: await handlers.handleLuuBaiHoc(lessonParams) }] };
        }

        case 'luu_tru_kien_thuc': {
          const { path, reason } = args as { path: string; reason?: string };
          return { content: [{ type: 'text' as const, text: await handlers.handleLuuTruKienThuc(path, reason) }] };
        }

        case 'phuc_hoi_kien_thuc': {
          const { path } = args as { path: string };
          return { content: [{ type: 'text' as const, text: await handlers.handlePhucHoiKienThuc(path) }] };
        }

        case 'xem_bieu_mau': {
          const { type } = args as { type: string };
          return { content: [{ type: 'text' as const, text: await handlers.handleXemBieuMau(type) }] };
        }

        case 'xem_khao_sat': {
          const { explorationId } = args as { explorationId: string };
          return { content: [{ type: 'text' as const, text: await handlers.handleXemKhaoSat(explorationId) }] };
        }

        case 'xem_dac_ta': {
          const { specId } = args as { specId: string };
          return { content: [{ type: 'text' as const, text: await handlers.handleXemDacTa(specId) }] };
        }

        case 'luu_danh_gia': {
          const reviewParams = args as {
            projectName: string;
            title: string;
            completeness: string;
            correctness: string;
            coherence: string;
            constraints: string;
            blastRadius: string;
            summary: string;
          };
          return { content: [{ type: 'text' as const, text: await handlers.handleLuuDanhGia(reviewParams) }] };
        }

        case 'phan_tich_ngu_canh_tu_dong': {
          const { chatContext, projectName, taskType } = args as {
            chatContext: string;
            projectName?: string;
            taskType?: TaskType;
          };

          const intents = analyzeIntent({ chatContext, projectName, taskType });

          const toolResults = await Promise.all(
            intents.map(async (intent) => ({
              tool: intent.toolName,
              score: intent.score,
              params: intent.extractedParams,
              result: await executeToolIntent(intent, ctx),
            }))
          );

          const detectedIntents = intents.map((i) => i.toolName);
          const totalResults = toolResults.reduce((acc, tr) => {
            try {
              const parsed = JSON.parse(tr.result);
              return acc + (Array.isArray(parsed) ? parsed.length : 1);
            } catch {
              return acc + (tr.result.length > 0 ? 1 : 0);
            }
          }, 0);

          const response = {
            intent_analysis: {
              detected_intents: detectedIntents,
              task_type: taskType || 'auto-detected',
              project: projectName || 'all',
              tools_called: intents.length,
            },
            tools_called: toolResults,
            summary: `Analyzed context → called ${intents.length} tool(s): [${detectedIntents.join(', ')}]. Found ${totalResults} result(s) total.`,
          };

          return {
            content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }],
          };
        }

        case 'sep_tao_change': {
          const p = args as {
            moTa: string; tenChange?: string; assignee?: string; mode?: SepMode;
            schema?: SchemaKey; capability?: string; project?: string;
          };
          return { content: [{ type: 'text' as const, text: await sep.handleTaoChange(p) }] };
        }

        case 'sep_luu_artifact': {
          const p = args as { tenChange?: string; file: string; noiDung: string };
          return { content: [{ type: 'text' as const, text: await sep.handleLuuArtifact(p) }] };
        }

        case 'sep_xem_change': {
          const p = (args ?? {}) as { tenChange?: string };
          return { content: [{ type: 'text' as const, text: await sep.handleXemChange(p) }] };
        }

        case 'sep_chon_change': {
          const p = args as { tenChange: string };
          return { content: [{ type: 'text' as const, text: await sep.handleChonChange(p) }] };
        }

        case 'sep_danh_sach_change': {
          const p = (args ?? {}) as { assignee?: string };
          return { content: [{ type: 'text' as const, text: await sep.handleDanhSachChange(p) }] };
        }

        case 'sep_duyet_buoc': {
          const p = args as {
            tenChange?: string; buoc?: StepKey; quyetDinh: Decision;
            tomTat: string; caiTien?: string; nguoiDuyet?: string;
          };
          return { content: [{ type: 'text' as const, text: await sep.handleDuyetBuoc(p) }] };
        }

        case 'sep_chuyen_trang_thai': {
          const p = args as { tenChange?: string; trangThai: LifecycleStatus };
          return { content: [{ type: 'text' as const, text: await sep.handleChuyenTrangThai(p) }] };
        }

        case 'sep_xem_persona': {
          const p = (args ?? {}) as { ten?: string };
          return { content: [{ type: 'text' as const, text: await sep.handleXemPersona(p) }] };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      console.error(`[CallToolError] Tool '${name}' failed:`, error);
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `Error executing tool '${name}': ${error.message}` }],
      };
    }
}

/**
 * Executes a single (read-only) tool intent from phan_tich_ngu_canh_tu_dong.
 * @param intent - Tool intent from the analyzer.
 * @param ctx - Request context.
 * @returns Result string.
 */
async function executeToolIntent(intent: ToolIntent, ctx: RequestContext): Promise<string> {
  const { handlers, sep } = ctx;
  const { toolName, extractedParams: params } = intent;

  try {
    switch (toolName) {
      case 'xem_tong_quan':
        return await handlers.handleXemTongQuan();
      case 'xem_ngu_canh_du_an':
        return await handlers.handleXemNguCanhDuAn(params.projectName as string);
      case 'tim_kiem_kien_thuc':
        return await handlers.handleTimKiemKienThuc(
          params.query as string,
          params.projectName as string | undefined
        );
      case 'xem_mau_thiet_ke':
        return await handlers.handleXemMauThietKe(params.patternId as string);
      case 'xem_quyet_dinh':
        return await handlers.handleXemQuyetDinh(params.decisionId as string);
      case 'xem_bai_hoc':
        return await handlers.handleXemBaiHoc(params.lessonId as string);
      case 'danh_sach_phien_gan_day':
        return await handlers.handleDanhSachPhienGanDay(
          params.days as number | undefined,
          params.projectName as string | undefined
        );
      case 'xem_bieu_mau':
        return await handlers.handleXemBieuMau(params.type as string);
      case 'xem_khao_sat':
        return await handlers.handleXemKhaoSat(params.explorationId as string);
      case 'xem_dac_ta':
        return await handlers.handleXemDacTa(params.specId as string);
      case 'sep_danh_sach_change':
        return await sep.handleDanhSachChange({ assignee: params.assignee as string | undefined });
      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error: any) {
    console.error(`[executeToolIntent] Error executing ${toolName}:`, error);
    return `Error executing ${toolName}: ${error.message}`;
  }
}

function createServer(ctx: RequestContext): Server {
  const server = new Server(
    { name: 'team-ai-knowledge-server', version: SERVER_VERSION },
    { capabilities: promptsEnabled() ? { tools: {}, prompts: {} } : { tools: {} } }
  );
  registerHandlers(server, ctx);
  return server;
}

/**
 * Starts MCP Server in stdio mode (local development).
 */
async function startStdioMode(provider: DataProvider): Promise<void> {
  const kbRoot = localKbRoot();
  const user = process.env.SEP_ASSIGNEE?.trim() || undefined;
  const afterWrite = createGitSync(kbRoot);
  const server = createServer({
    provider,
    handlers: createToolHandlers(provider, { author: user, afterWrite }),
    sep: createSepWorkflow(provider, {
      defaultAssignee: user,
      defaultProject: process.env.SEP_PROJECT,
      activeStore: createActiveStore(kbRoot),
      afterWrite,
    }),
    user,
    telemetry: true,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`🚀 MCP Server v${SERVER_VERSION} running on stdio`);
}

/**
 * Starts MCP Server in HTTP mode (remote / Render). Every request must carry a Bearer token
 * from MCP_AUTH_TOKENS; the mapped GitHub user becomes assignee, approver and commit author.
 */
async function startHttpMode(provider: DataProvider, auth: AuthConfig): Promise<void> {
  const port = parseInt(process.env.PORT || '3100', 10);

  const app = createMcpExpressApp({ host: '0.0.0.0' });

  app.post('/mcp', async (req, res) => {
    const user = authenticate(req.headers.authorization, auth);
    if (user === undefined) {
      res.status(401).set('WWW-Authenticate', 'Bearer').json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized — gửi header Authorization: Bearer <token>' },
        id: null,
      });
      return;
    }

    const userProvider = user
      ? withAuthor(provider, { name: user, email: `${user}@users.noreply.github.com` })
      : provider;
    const server = createServer({
      provider: userProvider,
      handlers: createToolHandlers(userProvider, { author: user ?? undefined }),
      sep: createSepWorkflow(userProvider, {
        defaultAssignee: user ?? process.env.SEP_ASSIGNEE,
        defaultProject: process.env.SEP_PROJECT,
      }),
      user: user ?? undefined,
      telemetry: false,
    });

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on('close', () => {
        transport.close();
        server.close();
      });
    } catch (error: any) {
      console.error('[HTTP] Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', async (_req, res) => {
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    }));
  });

  app.delete('/mcp', async (_req, res) => {
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    }));
  });

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: SERVER_VERSION, mode: 'http' });
  });

  app.listen(port, () => {
    console.error(
      `🚀 MCP Server v${SERVER_VERSION} running on HTTP at port ${port} ` +
      `(${auth.tokens.size} token${auth.anonymous ? ', cho phép ẩn danh' : ''})`,
    );
  });
}

/**
 * Main entry point — auto-detects mode and starts server.
 */
async function main(): Promise<void> {
  const mode = detectMode();
  const provider = createProvider(mode);

  console.error(`[Mode] ${mode.toUpperCase()} detected`);

  if (mode === 'http') {
    const auth = loadAuthConfig();
    await (provider as GitHubProvider).warmUp();
    await startHttpMode(provider, auth);
  } else {
    await startStdioMode(provider);
  }
}

main().catch((error) => {
  console.error('[Fatal Error] MCP Server failed to start:', error);
  process.exit(1);
});
