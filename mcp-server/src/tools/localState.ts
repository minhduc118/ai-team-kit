/**
 * Per-machine SEP state in ~/.sep (never committed):
 *   active.json      → change đang làm, theo từng KB root
 *   telemetry.jsonl  → mỗi lần gọi tool sep_* / dùng lệnh /sep-* (MCP + IDE hooks cùng ghi)
 * SEP_HOME overrides the folder (tests).
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import type { ActiveChangeStore } from './sepWorkflow.js';

export function sepHome(): string {
  return process.env.SEP_HOME || path.join(os.homedir(), '.sep');
}

function readJson(file: string): Record<string, any> {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

export function createActiveStore(kbRoot: string): ActiveChangeStore {
  const file = path.join(sepHome(), 'active.json');
  const key = path.resolve(kbRoot).toLowerCase();
  return {
    async get() {
      const entry = readJson(file)[key];
      return typeof entry?.change === 'string' ? entry.change : null;
    },
    async set(change: string) {
      const data = readJson(file);
      data[key] = { change, at: new Date().toISOString() };
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
    },
  };
}

export interface TelemetryEvent {
  source: 'mcp' | 'cursor' | 'claude' | 'antigravity';
  event: string;
  tool?: string;
  command?: string;
  change?: string;
  ok?: boolean;
  ms?: number;
  user?: string;
}

export function logTelemetry(ev: TelemetryEvent): void {
  if (process.env.SEP_TELEMETRY === 'false') return;
  try {
    const file = path.join(sepHome(), 'telemetry.jsonl');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), ...ev }) + '\n');
  } catch {
    // telemetry must never break a tool call
  }
}
