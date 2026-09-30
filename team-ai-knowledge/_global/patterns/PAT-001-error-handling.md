---
id: PAT-001
title: Standard Error Handling Pattern
date: "2026-09-14"
author: System
scope: global
category: code-style
tags: [error-handling, best-practice]
---

# PAT-001: Standard Error Handling Pattern

## Context & Intent
This pattern defines how errors must be captured, wrapped, and logged across all projects in the team.

## Rules
1. Never leave `catch` blocks empty.
2. Always log errors with contextual information (function name, input args summary).
3. Public functions must throw standard application errors or return explicit error objects.

## Code Example
```typescript
/**
 * Executes an operational task safely with detailed error context.
 * @param {string} taskId - Target task identifier.
 * @returns {Promise<void>}
 */
export async function executeTask(taskId: string): Promise<void> {
  try {
    await performOperation(taskId);
  } catch (error) {
    console.error(`[executeTask] Failed for task ${taskId}:`, error);
    throw new ApplicationError(`Failed executing task: ${taskId}`, { cause: error });
  }
}
```
