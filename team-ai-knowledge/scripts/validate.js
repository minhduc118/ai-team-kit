import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

/**
 * Loads and compiles a JSON Schema file.
 * @param {string} schemaPath - Path to the JSON schema file.
 * @returns {import('ajv').ValidateFunction}
 */
function loadSchema(schemaPath) {
  const content = fs.readFileSync(schemaPath, 'utf8');
  const schema = JSON.parse(content);
  return ajv.compile(schema);
}

const validators = {
  decision: loadSchema(path.resolve('.schema/decision.schema.json')),
  lesson: loadSchema(path.resolve('.schema/lesson.schema.json')),
  pattern: loadSchema(path.resolve('.schema/pattern.schema.json')),
  session: loadSchema(path.resolve('.schema/session.schema.json')),
};

/**
 * Determines the schema type based on file path.
 * @param {string} filePath - Target file path.
 * @returns {'decision' | 'lesson' | 'pattern' | 'session' | null}
 */
function getSchemaType(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/decisions/')) return 'decision';
  if (normalized.includes('/lessons/')) return 'lesson';
  if (normalized.includes('/patterns/')) return 'pattern';
  if (normalized.includes('/sessions/')) return 'session';
  return null;
}

/**
 * Validates a single markdown file against its corresponding schema.
 * @param {string} filePath - Path to markdown file.
 * @returns {boolean} True if valid or skipped, false if validation errors found.
 */
function validateFile(filePath) {
  const schemaType = getSchemaType(filePath);
  if (!schemaType) return true; // Skip files without schema requirement

  try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(rawContent);

    if (Object.keys(data).length === 0) {
      console.error(`❌ [ERROR] ${filePath}: Missing YAML frontmatter.`);
      return false;
    }

    const validate = validators[schemaType];
    const valid = validate(data);

    if (!valid) {
      console.error(`❌ [ERROR] ${filePath} failed validation:`);
      validate.errors.forEach((err) => {
        console.error(`   - ${err.instancePath || 'root'} ${err.message}`);
      });
      return false;
    }

    console.log(`✅ [OK] ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ [CRITICAL] Failed reading ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Main entry point for knowledge base validation.
 * @returns {Promise<void>}
 */
async function main() {
  console.log('🔍 Validating Knowledge Base Frontmatter...\n');
  const files = await glob('**/*.md', { ignore: ['node_modules/**', 'mcp-server/**'] });
  let hasErrors = false;

  for (const file of files) {
    const isOk = validateFile(file);
    if (!isOk) hasErrors = true;
  }

  if (hasErrors) {
    console.error('\n❌ Knowledge base validation failed.');
    process.exit(1);
  } else {
    console.log('\n✨ All Markdown frontmatters passed validation!');
  }
}

main().catch((err) => {
  console.error('[Fatal Error] Validation script crashed:', err);
  process.exit(1);
});
