#!/usr/bin/env node
/**
 * SEP prompt hook — logs every /sep-* command the user types into ~/.sep/telemetry.jsonl.
 *
 *   Cursor      (~/.cursor/hooks.json, beforeSubmitPrompt): node sep-hook.js cursor
 *   Claude Code (~/.claude/settings.json, UserPromptSubmit): node sep-hook.js claude
 *
 * Fail-open: any error still lets the prompt through.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

const ide = process.argv[2] === 'claude' ? 'claude' : 'cursor';

function allow() {
  // Claude adds hook stdout to the prompt context, so it must stay silent.
  if (ide === 'cursor') process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

try {
  if (process.env.SEP_TELEMETRY === 'false') allow();
  const input = JSON.parse(readStdin() || '{}');
  const prompt = String(input.prompt ?? '');
  const match = prompt.match(/(?:^|\s)\/(sep-[a-z-]+)(?:\s+([^\s]+))?/);
  if (match) {
    const dir = process.env.SEP_HOME || path.join(os.homedir(), '.sep');
    fs.mkdirSync(dir, { recursive: true });
    let user = process.env.SEP_ASSIGNEE;
    try {
      user ||= JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8')).user;
    } catch {
      // not installed through `sep install`
    }
    // /sep-spec takes a free-text description, the other commands take a change name
    const change = match[1] !== 'sep-spec' && match[2] && /^[a-z0-9-]+$/.test(match[2]) ? match[2] : undefined;
    const event = {
      ts: new Date().toISOString(),
      source: ide,
      event: 'command',
      command: `/${match[1]}`,
      change,
      user: user || os.userInfo().username,
    };
    fs.appendFileSync(path.join(dir, 'telemetry.jsonl'), JSON.stringify(event) + '\n');
  }
} catch {
  // never block the prompt
}
allow();
