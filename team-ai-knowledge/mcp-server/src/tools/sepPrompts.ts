/**
 * Exposes sep-kit/skills/<name>/SKILL.md as MCP prompts, so any MCP client
 * (Windsurf, VS Code, …) gets /sep-* without installing skills.
 * Disable with SEP_PROMPTS=false where the IDE already has native skills.
 */

import matter from 'gray-matter';
import type { DataProvider } from '../providers/dataProvider.js';

export const SKILLS_DIR = 'sep-kit/skills';

export interface SepPrompt {
  name: string;
  description: string;
  body: string;
}

export async function loadSepPrompts(provider: DataProvider): Promise<SepPrompt[]> {
  const files = (await provider.listFiles(SKILLS_DIR, 'SKILL.md'))
    .filter(f => /^sep-kit\/skills\/[^/]+\/SKILL\.md$/.test(f))
    .sort();
  const prompts: SepPrompt[] = [];
  for (const file of files) {
    const raw = await provider.readFile(file);
    if (!raw) continue;
    const { data, content } = matter(raw);
    const name = String(data.name ?? file.split('/')[2]);
    prompts.push({ name, description: String(data.description ?? name), body: content.trim() });
  }
  return prompts;
}

export const PROMPT_ARGUMENTS = [
  {
    name: 'input',
    description: 'Mô tả chức năng (/sep-spec) hoặc tên change / ghi chú thêm cho bước này',
    required: false,
  },
];

export function renderPrompt(prompt: SepPrompt, input?: string): string {
  const extra = input?.trim() ? `\n\n---\n\nĐầu vào của user: ${input.trim()}` : '';
  return `${prompt.body}${extra}`;
}
