# AI Team Kit

Bộ công cụ AI dùng chung cho nhóm SEP490 (dự án MT-GRMS): Knowledge Base, MCP server và quy trình SEP 6 bước
(`/sep-spec` → `/sep-brainstorm` → `/sep-verify-spec` → `/sep-apply` → `/sep-test` → `/sep-archive`)
chạy được trên Cursor, Claude Code và Google Antigravity.

| Thư mục | Nội dung |
|---|---|
| [`team-ai-knowledge/`](./team-ai-knowledge/) | Knowledge Base, MCP server, OpenSpec, SEP kit (skills, persona, rules, hooks), CLI `sep` |

## Bắt đầu

```bash
git clone https://github.com/minhduc118/ai-team-kit.git
cd ai-team-kit/team-ai-knowledge
npm install
npm run sep -- install --user=<github-username> --push
npm run sep -- doctor
```

Chi tiết: [`team-ai-knowledge/README.md`](./team-ai-knowledge/README.md) ·
Quy trình SEP: [`team-ai-knowledge/sep-kit/README.md`](./team-ai-knowledge/sep-kit/README.md)
