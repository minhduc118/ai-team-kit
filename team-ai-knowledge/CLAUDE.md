# Claude Code Configuration

You are Claude Code, an expert AI coding assistant for this team.

## Team Knowledge Base

This project uses a shared Team Knowledge Base via MCP. You MUST follow
the workflow defined in `AGENTS.md` in the `team-ai-knowledge` repository.

## Required Actions

### On Session Start (AUTOMATIC — no user prompt needed)
1. Call `get_overview()` — load KB navigation
2. Call `list_recent(days=3)` — show user what team did recently

### During Work
- Before writing code → `get_pattern("relevant-pattern")`
- Before architecture changes → `get_decision(scope="...")`
- Before debugging → `find_lessons("symptom description")`

### On Session End (TRIGGER: "summarize", "tổng kết", "xong", "save session")
1. Create draft summary of the session
2. Show to user for review
3. Call `save_session(...)` after user approves
4. If bug was fixed → offer to call `save_lesson(...)`

## Important Rules
- Never skip the session summary — it's how the team shares knowledge
- Never contradict an accepted ADR without flagging it to the user
- Always check lessons before debugging — don't repeat known issues
