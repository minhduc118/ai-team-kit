---
id: ADR-0001
title: Adoption of Hybrid MCP Knowledge Base Architecture
date: "2026-09-14"
status: accepted
author: Tech Lead
scope: cross-cutting
impact: high
tags: [mcp, architecture, knowledge-base]
---

# ADR-0001: Adoption of Hybrid MCP Knowledge Base Architecture

## Status
Accepted

## Context
Team members use different AI tools (Cursor, Claude Code, Windsurf, Copilot). Context was fragmented across individual chats and local workspaces.

## Decision
Adopt a centralized Git repository (`team-ai-knowledge`) for Markdown context, paired with local stdio MCP servers for searching and saving session histories.

## Consequences
- **Positive:** Team shares context across AI engines seamlessly.
- **Positive:** Zero vendor lock-in for AI tools.
- **Negative:** Requires disciplined session summary commits.
