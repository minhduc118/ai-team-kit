# 🚀 Team AI Knowledge Base — Điểm Xuất Phát

> **Dành cho AI Agents:** Đọc file này TRƯỚC KHI làm bất kỳ việc gì.  
> **Dành cho Dev:** Đây là bản đồ điều hướng toàn bộ knowledge base của team.

---

## Bạn đang ở đây

```
team-ai-knowledge/
├── _global/          ← Knowledge áp dụng cho TẤT CẢ projects
├── projects/         ← Knowledge riêng từng project
│   ├── MT-GRMS/
│   ├── document-workspace-hub/
│   └── team-ai-knowledge/
├── openspec/         ← Quy trình SEP: changes/ (đang làm), specs/ (spec gốc), schemas/, config.yaml
└── sep-kit/          ← Skills /sep-*, persona review, rules, hooks — cài bằng `npm run sep -- install`
```

---

## 📌 Cho AI Agents: Đọc ngay những thứ này

### Bước 1 — Luôn làm đầu tiên
Gọi tool `list_recent(days=3)` để biết team vừa làm gì gần đây.

### Bước 2 — Tuỳ theo task
| Task của bạn | Tra cứu ở đâu |
|---|---|
| Viết code mới | `get_pattern("tên-pattern")` |
| Thay đổi kiến trúc | `get_decision(scope="...")` |
| Debug bug | `find_lessons("mô tả lỗi")` |
| Cần hiểu project | `get_context("tên-doc")` |
| Tìm kiếm chung | `search_knowledge("từ khoá")` |

### Bước 3 — Cuối phiên (BẮT BUỘC)
Khi user nói "tổng kết", "summarize", hoặc kết thúc → Gọi `save_session(...)`.

> Xem `AGENTS.md` để biết đầy đủ quy trình.

---

## 🗂️ Điều hướng nhanh

### Global Knowledge (áp dụng mọi project)

| Loại | Đường dẫn | Mô tả |
|------|-----------|-------|
| **Patterns** | [`_global/patterns/`](./_global/patterns/) | Coding conventions của team |
| **Decisions** | [`_global/decisions/`](./_global/decisions/) | Quyết định cấp team |
| **Lessons** | [`_global/lessons/`](./_global/lessons/) | Bài học chung |

### Projects

| Project | Đường dẫn | Mô tả |
|---------|-----------|-------|
| MT-GRMS | [`projects/MT-GRMS/`](./projects/MT-GRMS/) | Đồ án SEP490 — hệ thống quản lý chuỗi tạp hoá đa tenant ([tổng quan](./projects/MT-GRMS/context/overview.md)) |
| document-workspace-hub | [`projects/document-workspace-hub/`](./projects/document-workspace-hub/) | Workspace tài liệu |
| team-ai-knowledge | [`projects/team-ai-knowledge/`](./projects/team-ai-knowledge/) | Knowledge về bản thân hệ thống KB |

> Thêm project mới vào đây sau khi tạo.

---

## 🔁 Quy trình SEP (làm chức năng)

6 lệnh cho 6 bước: `/sep-spec` → `/sep-brainstorm` → `/sep-verify-spec` → `/sep-apply` → `/sep-test` → `/sep-archive`
(`/sep-status` xem tiến độ). Mỗi bước kết thúc bằng Approve/Reject. Chi tiết: [`sep-kit/README.md`](./sep-kit/README.md).

---

## 📋 Patterns hay dùng nhất

- [PAT-001: Error Handling](./_global/patterns/PAT-001-error-handling.md) — Cách xử lý lỗi của team

---

## 📖 Decisions quan trọng nhất

- [ADR-0001: Hybrid MCP Knowledge Base Architecture](./_global/decisions/ADR-0001-mcp-architecture.md)

---

## ⚠️ Quy tắc vàng

1. **Không xoá file** — Chỉ chuyển vào `archive/` và đánh dấu superseded
2. **Không sửa ADR cũ** — Tạo ADR mới thay thế và link qua lại
3. **Luôn có frontmatter** — Mọi file phải có YAML frontmatter đúng schema
4. **Commit KB cùng code** — Thay đổi code → commit KB trong cùng session

---

*Cập nhật lần cuối: 2026-09-30 | Maintainer: Team Lead*
