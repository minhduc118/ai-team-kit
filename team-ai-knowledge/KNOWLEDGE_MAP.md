# KNOWLEDGE_MAP.md — Bản đồ Knowledge Base

> Dùng file này để hiểu toàn bộ cấu trúc KB và quan hệ giữa các docs.

---

## Cấu trúc tổng quan

```
team-ai-knowledge/
│
├── _global/                    ← Áp dụng cho TẤT CẢ projects
│   ├── patterns/               ← Coding conventions
│   ├── decisions/              ← Quyết định cấp team
│   ├── lessons/                ← Bài học chung
│   └── templates/              ← Mẫu: decision, lesson, pattern, session, review, exploration, spec
│
├── projects/                   ← Riêng từng project
│   └── {project-name}/
│       ├── context/overview.md ← Thông tin nền dự án (tool xem_ngu_canh_du_an)
│       ├── decisions/          ← ADR riêng project
│       ├── lessons/            ← Lessons riêng project
│       ├── sessions/           ← Lịch sử phiên làm việc
│       ├── reviews/            ← Báo cáo đánh giá D1–D5
│       └── archive/            ← Docs đã superseded
│
├── openspec/                   ← Quy trình SEP
│   ├── config.yaml             ← Bối cảnh dự án cho agent
│   ├── schemas/                ← feature / bug-fix / refactor
│   ├── changes/<change>/       ← Artifact 6 bước (chỉ ghi qua tool sep_*)
│   └── specs/<capability>/     ← Spec gốc, merge khi /sep-archive
│
└── sep-kit/                    ← skills/, agents/ (persona), rules/, hooks/
```

---

## Global Patterns

| File | Scope | Mô tả ngắn |
|------|-------|------------|
| [PAT-001-error-handling.md](./_global/patterns/PAT-001-error-handling.md) | global | Standard Error Handling Pattern |

---

## Global Decisions

| ID | Status | Scope | Title |
|----|--------|-------|-------|
| [ADR-0001](./_global/decisions/ADR-0001-mcp-architecture.md) | accepted | cross-cutting | Hybrid MCP Knowledge Base Architecture |

---

## Projects

| Project | Status | Mô tả |
|---------|--------|-------|
| [MT-GRMS](./projects/MT-GRMS/) | active | Đồ án SEP490 — quản lý chuỗi tạp hoá đa tenant |
| [document-workspace-hub](./projects/document-workspace-hub/) | active | Workspace tài liệu |
| [team-ai-knowledge](./projects/team-ai-knowledge/) | active | Knowledge về bản thân hệ thống KB |

---

## Cách đọc KB theo từng tình huống

### Tôi là dev mới, cần hiểu tổng quan
1. Đọc file này
2. Đọc `_global/patterns/` — biết team code kiểu gì
3. Đọc `projects/{project-của-tôi}/context/overview.md`
4. Đọc `openspec/config.yaml` — stack và rule kỹ thuật

### Tôi cần biết team đã quyết định gì về X
1. Tìm trong `_global/decisions/` — quyết định cấp team
2. Tìm trong `projects/{project}/decisions/` — quyết định riêng project

### Tôi đang gặp bug, muốn biết team đã gặp chưa
1. Tìm trong `projects/{project}/lessons/` — lessons riêng project
2. Tìm trong `_global/lessons/` — lessons chung

### Tôi muốn biết team đã làm gì tuần qua
1. Xem `projects/{project}/sessions/` — sắp xếp theo ngày
