# SEP Kit — 6 lệnh cho 6 bước làm một chức năng

Mọi chức năng đi qua đúng 6 bước. Mỗi bước là một skill (slash command) chạy được trên **Cursor**, **Claude Code** và **Google Antigravity**.
Cuối mỗi bước, agent dừng lại hỏi **Approve / Reject** — chỉ khi bạn Approve thì bước sau mới mở.

| # | Lệnh | Bước | Artifact bắt buộc (`openspec/changes/<change>/`) | Điều kiện qua bước |
|---|---|---|---|---|
| 1 | `/sep-spec tôi muốn thực hiện chức năng A` | Spec | `.session.md`, `proposal.md` | đủ file + Approve |
| 2 | `/sep-brainstorm` | Brainstorm | `exploration.md`, `design-brief.md`¹, `specs.md` (delta) | đủ file + Approve |
| 3 | `/sep-verify-spec` | Verify Spec | `review/skeptic.md`, `tasks.md` | đủ file, tasks có checklist + Approve |
| 4 | `/sep-apply` | Apply | code + tick `tasks.md` | mọi task `- [x]` + Approve |
| 5 | `/sep-test` | Test | `test-report.md` | `verdict: PASS` + Approve |
| 6 | `/sep-archive` | Archive | merge `specs.md` → `openspec/specs/<capability>/spec.md` | `.status = archived` |

`/sep-status` — xem change đang làm, bước hiện tại, việc tiếp theo. Không cần gõ tên change: MCP nhớ change đang làm (`sep_chon_change` để đổi).

¹ Schema `bug-fix` và `refactor` không cần `design-brief.md`. Schema chọn ở `/sep-spec` (xem `openspec/schemas/`).

Artifact tuỳ chọn: `research.md` (brainstorm), `review/guardian.md`, `review/advocate.md`, `review/codebase.md` (verify-spec).
Mỗi lần Approve/Reject được ghi vào `summary.md`; Reject kèm lý do → `improvements.md` (bài học cho lần sau).

TeamSpec Monitor chấm compliance = số bước đã qua / 6. Làm bước sau khi bước trước chưa xong → **BLOCKED**.

## Cài đặt (mỗi thành viên, 1 lần)

```bash
git clone https://github.com/minhduc118/ai-team-kit.git
cd ai-team-kit/team-ai-knowledge
npm install
npm run sep -- install --user=<github-username> --push
npm run sep -- doctor               # kiểm tra mọi thứ đã xanh
```

Khởi động lại IDE sau khi cài. `install` tự phát hiện IDE có trên máy (hoặc chỉ định `--ide=cursor,claude,antigravity`):

| Thành phần | Cursor | Claude Code | Antigravity |
|---|---|---|---|
| MCP server `sep` | `~/.cursor/mcp.json` | `claude mcp add` | `~/.gemini/config/mcp_config.json` |
| Skills `/sep-*` | `~/.cursor/skills/` | `~/.claude/skills/` | `~/.gemini/config/skills/` (dùng chung cho Antigravity 2.0, IDE, CLI) |
| Persona review | `~/.cursor/agents/` | `~/.claude/agents/` | nhúng trong skill verify-spec |
| Rules | `init` → `.cursor/rules/*.mdc` | khối trong `~/.claude/CLAUDE.md` | `~/.gemini/config/rules/` + `init` → `.agents/rules/` |
| Hook telemetry | `~/.cursor/hooks.json` | `~/.claude/settings.json` | — (MCP tự ghi) |

### Dành cho người dùng Antigravity

```bash
npm run sep -- install --ide=antigravity --user=<github-username> --push
```

- Mở Antigravity ít nhất một lần trước khi cài (để có thư mục `~/.gemini`), hoặc luôn truyền `--ide=antigravity`.
- Kiểm tra MCP: bảng agent → `…` → **MCP Servers** → **Manage MCP Servers** → server `sep` phải bật, có 24 tool.
  Xem cấu hình: **View raw config** (chính là `~/.gemini/config/mcp_config.json`).
- Gõ `/sep-spec …` trong chat — lệnh đến từ skill ở `~/.gemini/config/skills/`. Kit không còn sinh Workflow
  vì Antigravity ngừng hỗ trợ Workflow từ 1/11/2026; `install` tự dọn workflow `/sep-*` do bản cũ tạo.
- Antigravity không có sub-agent tuỳ biến: ở `/sep-verify-spec` agent tự đóng vai lần lượt từng persona (lấy qua `sep_xem_persona`).

| Tuỳ chọn `install` | Ý nghĩa |
|---|---|
| `--user=<name>` | GitHub username (assignee, khớp "My Changes" trên TeamSpec) |
| `--ide=<list>` | Chỉ cài cho IDE chỉ định |
| `--push` | Tự `git push` sau mỗi artifact (mặc định chỉ commit) |
| `--no-commit` | Không tự commit |
| `--project=<name>` | Tên dự án ghi vào `.session.md` (mặc định `MT-GRMS`) |
| `--link` | Symlink skill thay vì copy (dành cho người sửa kit) |

IDE khác (Windsurf, VS Code, …): chỉ cần đăng ký MCP server `node <KB>/mcp-server/dist/index.js` — 7 skill `/sep-*`
có sẵn dưới dạng **MCP prompts** (tắt bằng `SEP_PROMPTS=false`).

### Gắn kit vào repo code

```bash
npm run sep -- init ../sep490-backend      # ghi rules cho Cursor + Antigravity + khối trỏ trong AGENTS.md
npm run sep -- init ../sep490-backend --remove
```

## Các lệnh CLI khác

| Lệnh | Việc làm |
|---|---|
| `npm run sep -- list [--all\|--user=x]` | Danh sách change + việc tiếp theo |
| `npm run sep -- status [change]` | Chi tiết từng bước, duyệt, task |
| `npm run sep -- validate [--strict]` | Kiểm tra OpenSpec, schema, persona, skill (CI chạy lệnh này) |
| `npm run sep -- stats [--days=7]` | Thống kê telemetry từ `~/.sep/telemetry.jsonl` |
| `npm run sep -- sync` | Pull KB mới + cài lại skill/rules |
| `npm run sep -- uninstall` | Gỡ toàn bộ |

## Luật do MCP server cưỡng chế (skill không lách được)

- Không lưu được artifact của bước sau khi bước trước chưa qua **hoặc chưa được Approve** (change tạo từ v2.1 có `gate: true`).
- `apply` cần xong Spec + Brainstorm + Verify Spec; `test-report.md` cần mọi task đã tick; `archived` cần `verdict: PASS`.
- `.status` chỉ tiến lên, không lùi. Change đã archive thì không sửa được.
- Mỗi lần lưu → commit `sep(<change>): ...` bằng git identity của bạn.

## Cấu trúc

```
sep-kit/
├── skills/<sep-*>/SKILL.md   ← 7 skill (6 bước + status)
├── agents/*.md               ← persona: skeptic, guardian, advocate, codebase (readonly)
├── rules/*.md                ← apply: always | auto | glob — render ra từng IDE
└── hooks/sep-hook.js         ← ghi telemetry khi gõ /sep-* (fail-open)
```

Sửa skill/persona/rule → `npm run sep -- validate` → commit → cả team `npm run sep -- sync`.
Quy tắc bước nằm ở `mcp-server/src/tools/sepWorkflow.ts` (`SEP_STEPS`, `SCHEMAS`) và phải khớp
`openspec/schemas/*/schema.yaml` (`validate` kiểm tra) cùng `WORKFLOW_STAGES` / `SCHEMA_ARTIFACTS`
trong `sep490-frontend/src/features/teamspec/lib/compliance.ts`.
