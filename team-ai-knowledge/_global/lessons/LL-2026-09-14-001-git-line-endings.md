---
id: LL-2026-09-14-001
title: Handling Cross-Platform Git Line Endings (LF vs CRLF)
date: "2026-09-14"
author: Dev Team
scope: devops
severity: medium
resolution: resolved
tags: [git, windows, linux]
---

# LL-2026-09-14-001: Handling Cross-Platform Git Line Endings

## Problem
Team members working on Windows (CRLF) and Linux/macOS (LF) generated massive diffs when editing Markdown files due to line ending conversion issues.

## Solution
Added `.gitattributes` to enforce `* text=auto eol=lf` across all Markdown files in the KB repository.
