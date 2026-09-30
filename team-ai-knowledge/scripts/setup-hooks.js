import fs from 'fs';
import path from 'path';

/**
 * Installs Git pre-commit hook to validate frontmatter.
 * @returns {void}
 */
function main() {
  const hookDir = path.resolve('.git/hooks');
  if (!fs.existsSync(hookDir)) {
    console.error('❌ .git directory not found. Please initialize git repo first (git init).');
    process.exit(1);
  }

  const hookFile = path.join(hookDir, 'pre-commit');
  const hookScript = `#!/bin/sh
echo "🔍 Running Team AI Knowledge Base Pre-commit Validation..."
npm run validate
if [ $? -ne 0 ]; then
  echo "❌ Frontmatter validation failed. Commit aborted."
  exit 1
fi
`;

  fs.writeFileSync(hookFile, hookScript, { mode: 0o755 });
  console.log('✅ Git pre-commit hook installed successfully!');
}

main();
