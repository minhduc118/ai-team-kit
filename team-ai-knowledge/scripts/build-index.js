import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';

/**
 * Extracts headings from Markdown content.
 * @param {string} content - Markdown text content.
 * @returns {Array<{ level: number, text: string }>}
 */
function extractHeadings(content) {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
    });
  }
  return headings;
}

/**
 * Parses a single Markdown file into a searchable document object.
 * @param {string} filePath - Path to Markdown file.
 * @returns {object | null}
 */
function parseDoc(filePath) {
  try {
    const relativePath = filePath.replace(/\\/g, '/');
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data: frontmatter, content } = matter(raw);
    const headings = extractHeadings(content);

    const projectMatch = relativePath.match(/^projects\/([^/]+)/);
    const project = projectMatch ? projectMatch[1] : 'global';

    return {
      id: relativePath,
      path: relativePath,
      project,
      title: frontmatter.title || path.basename(filePath, '.md'),
      frontmatter,
      headings: headings.map((h) => h.text),
      content,
      updatedAt: frontmatter.date || new Date().toISOString().split('T')[0],
    };
  } catch (error) {
    console.error(`[parseDoc] Error parsing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Main function to build and save search index.
 * @returns {Promise<void>}
 */
async function main() {
  console.log('⚡ Building Knowledge Base Search Index...\n');
  const files = await glob('**/*.md', { ignore: ['node_modules/**', 'mcp-server/**'] });
  const docs = [];

  for (const file of files) {
    const parsed = parseDoc(file);
    if (parsed) {
      docs.push(parsed);
    }
  }

  const outputDir = path.resolve('.index');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const indexPath = path.join(outputDir, 'search-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(docs, null, 2), 'utf8');

  console.log(`✅ Search index built successfully with ${docs.length} documents.`);
  console.log(`📍 Saved to: ${indexPath}`);
}

main().catch((err) => {
  console.error('[Fatal Error] Build index script crashed:', err);
  process.exit(1);
});
