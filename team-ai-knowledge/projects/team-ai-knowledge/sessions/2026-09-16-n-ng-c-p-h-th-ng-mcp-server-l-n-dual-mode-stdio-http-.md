---
id: SES-2026-09-16-709
date: "2026-09-16"
author: AI-Agent
project: team-ai-knowledge
goals: ["Bổ sung kết nối qua HTTP cho MCP Server","Tạo DataProvider interface (LocalProvider, GitHubProvider)","Hỗ trợ auto-detect theo biến môi trường"]
status: completed
files_changed: ["mcp-server/src/providers/dataProvider.ts","mcp-server/src/providers/localProvider.ts","mcp-server/src/providers/gitHubProvider.ts","mcp-server/src/tools/toolHandlers.ts","mcp-server/src/index.ts",".mcp.json.template","README.md","system_flow.md","render_deployment_guide.md"]
tags: [session, summary]
---

# Session Summary: Nâng cấp hệ thống MCP Server lên Dual-Mode (Stdio + HTTP)

### What Changed
- `mcp-server/src/providers/*`: Viết mới kiến trúc `DataProvider` nhằm cô lập phần dữ liệu ra khỏi business logic, cung cấp 2 phương thức giao tiếp là `LocalProvider` (`fs`) và `GitHubProvider` (GitHub Contents API + In-Memory Caching).
- `mcp-server/src/tools/toolHandlers.ts`: Refactor toàn bộ handlers để chuyển sang dùng DataProvider thay cho `fs` tĩnh.
- `mcp-server/src/index.ts`: Refactor file entry point. Tự động nhận diện chế độ khởi động (Remote HTTP/Local Stdio) qua biến môi trường `GITHUB_TOKEN`. Tích hợp thư viện `express` và `StreamableHTTPServerTransport`.
- `.mcp.json.template` & `README.md`: Cập nhật tài liệu hướng dẫn và template config, sửa lỗi tham số cấu hình IDE từ `url` thành `serverURL`.
- `system_flow.md` & `render_deployment_guide.md`: Tạo tài liệu artifact cho sơ đồ luồng hệ thống chi tiết và hướng dẫn deploy lên dịch vụ Render.

### Key Decisions
- Quyết định dùng GitHub Contents API thay vì hệ thống file hệ điều hành cho remote deployment, nhằm khắc phục hạn chế mất dữ liệu sau mỗi lần sleep/restart của Render Free-tier. Dữ liệu sẽ được commit tự động thẳng vào Github repository.
- Quyết định gắn in-memory cache với TTL = 5 phút tại GithubProvider để ngăn chặn tình trạng cạn kiệt GitHub API rate limits.
- Chọn mô hình Auto-detect thay vì CLI flags để server tự điều chỉnh cách khởi chạy phù hợp với môi trường.

### Issues Encountered
- Config trên IDE Antigravity (Windsurf/Claude) với kiểu "streamable-http" báo lỗi `Error: serverURL or command must be specified.` → Cách giải quyết: Đổi khoá `"url"` trong json configuration thành `"serverURL"`.

### Follow-up Tasks
- [ ] Tiến hành đưa server chính thức live trên tài khoản Render thật và test tính ổn định dài hạn.