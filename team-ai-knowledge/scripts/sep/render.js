/**
 * Render sep-kit sources (rules, skills, personas) into each IDE's format.
 *
 *   sep-kit/rules/*.md   frontmatter: description, apply (always | auto | glob), globs
 *   sep-kit/skills/<name>/SKILL.md
 *   sep-kit/agents/*.md  frontmatter: name, description, readonly
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { KIT_DIR, listDirs, listMd } from './lib.js';

export const ANTIGRAVITY_WORKFLOW_LIMIT = 12_000;

const q = s => JSON.stringify(String(s ?? ''));

function frontmatter(fields) {
  const lines = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? q(v) : v}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

export function readRules() {
  const dir = path.join(KIT_DIR, 'rules');
  return listMd(dir).map(file => {
    const { data, content } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
    return {
      name: file.replace(/\.md$/, ''),
      description: String(data.description ?? ''),
      apply: ['always', 'auto', 'glob'].includes(data.apply) ? data.apply : 'auto',
      globs: data.globs ? String(data.globs) : '',
      body: content.trim(),
    };
  });
}

export function readSkills() {
  const dir = path.join(KIT_DIR, 'skills');
  return listDirs(dir)
    .filter(name => fs.existsSync(path.join(dir, name, 'SKILL.md')))
    .map(name => {
      const raw = fs.readFileSync(path.join(dir, name, 'SKILL.md'), 'utf8');
      const { data, content } = matter(raw);
      return { name, dir: path.join(dir, name), description: String(data.description ?? ''), body: content.trim(), raw };
    });
}

export function readPersonas() {
  const dir = path.join(KIT_DIR, 'agents');
  return listMd(dir).map(file => {
    const { data, content } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
    return {
      file,
      name: String(data.name ?? `sep-${file.replace(/\.md$/, '')}`),
      description: String(data.description ?? ''),
      readonly: data.readonly !== false,
      body: content.trim(),
    };
  });
}

/** .cursor/rules/<name>.mdc */
export function cursorRule(rule) {
  return frontmatter({
    description: rule.description,
    globs: rule.apply === 'glob' ? rule.globs : undefined,
    alwaysApply: rule.apply === 'always',
  }) + '\n' + rule.body + '\n';
}

/** .agents/rules/<name>.md or ~/.gemini/config/rules/<name>.md */
export function antigravityRule(rule) {
  const trigger = { always: 'always_on', auto: 'model_decision', glob: 'glob' }[rule.apply];
  return frontmatter({
    trigger,
    description: rule.description,
    globs: rule.apply === 'glob' ? rule.globs : undefined,
  }) + '\n' + rule.body + '\n';
}

/** Antigravity workflow (/sep-*) generated from a skill */
export function antigravityWorkflow(skill) {
  return frontmatter({ description: skill.description }) + '\n' + skill.body + '\n';
}

/** Sub-agent file for Cursor (~/.cursor/agents) or Claude Code (~/.claude/agents) */
export function agentFile(persona, ide) {
  const fields = ide === 'claude'
    ? { name: persona.name, description: persona.description, tools: persona.readonly ? 'Read, Grep, Glob' : undefined }
    : { name: persona.name, description: persona.description, readonly: persona.readonly };
  return frontmatter(fields) + '\n' + persona.body + '\n';
}

/** Markdown block for AGENTS.md / CLAUDE.md: full text of always-on rules, pointers for the rest */
export function rulesBlock(rules) {
  const always = rules.filter(r => r.apply === 'always');
  const others = rules.filter(r => r.apply !== 'always');
  return [
    '<!-- Sinh tự động bởi `npm run sep -- init|sync` từ team-ai-knowledge/sep-kit/rules. Sửa ở nguồn, đừng sửa trong khối này. -->',
    ...always.map(r => r.body.replace(/^# /m, '## ')),
    others.length
      ? ['## Rules theo ngữ cảnh', ...others.map(r => `- **${r.name}** — ${r.description}`)].join('\n')
      : '',
  ].filter(Boolean).join('\n\n');
}
