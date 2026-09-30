import { LocalProvider } from './dist/providers/localProvider.js';
import { createToolHandlers } from './dist/tools/toolHandlers.js';
import path from 'path';
import url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const kbRoot = path.join(__dirname, '..');

const provider = new LocalProvider(kbRoot);
const handlers = createToolHandlers(provider);

async function test() {
  console.log("Archiving...");
  const archiveResult = await handlers.handleArchiveKnowledge('projects/team-ai-knowledge/context/test-doc.md', 'Test archiving');
  console.log(archiveResult);

  console.log("Restoring...");
  const restoreResult = await handlers.handleRestoreKnowledge('projects/team-ai-knowledge/archive/context/test-doc.md');
  console.log(restoreResult);
}

test().catch(console.error);
