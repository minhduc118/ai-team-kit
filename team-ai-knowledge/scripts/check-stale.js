import fs from 'fs';
import { glob } from 'glob';
import matter from 'gray-matter';

const STALE_DAYS = 90;

/**
 * Calculates days between given date string and today.
 * @param {string} dateStr - Date string (YYYY-MM-DD).
 * @returns {number} Days elapsed.
 */
function getDaysOld(dateStr) {
  if (!dateStr) return 999;
  const docDate = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now - docDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Checks all documents for stale dates.
 * @returns {Promise<void>}
 */
async function main() {
  console.log(`⏳ Checking for documents older than ${STALE_DAYS} days...\n`);
  const files = await glob('**/*.md', { ignore: ['node_modules/**', 'mcp-server/**', 'START_HERE.md', 'AGENTS.md', 'KNOWLEDGE_MAP.md'] });
  let staleCount = 0;

  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const { data } = matter(raw);
      const days = getDaysOld(data.date);

      if (days > STALE_DAYS) {
        console.warn(`⚠️ [STALE] ${file} (${days} days old - last updated: ${data.date || 'unknown'})`);
        staleCount++;
      }
    } catch (error) {
      console.error(`Failed parsing ${file}:`, error.message);
    }
  }

  if (staleCount === 0) {
    console.log('✨ All documents are fresh and up to date!');
  } else {
    console.log(`\nFound ${staleCount} stale document(s). Please review and update.`);
  }
}

main().catch((err) => {
  console.error('[Fatal Error] Stale checker crashed:', err);
  process.exit(1);
});
