/**
 * DataProvider Interface — Abstraction layer for KB data access.
 *
 * Implementations:
 * - LocalProvider: reads/writes from local filesystem
 * - GitHubProvider: reads/writes via GitHub Contents API
 */

/**
 * Normalizes a KB-relative path and rejects anything that could escape the KB root
 * (absolute paths, drive letters, `..` segments) or touch git internals.
 * @returns POSIX path without leading/trailing slashes ('' = KB root).
 */
export function safeRelPath(relativePath: string): string {
  const raw = String(relativePath ?? '').replace(/\\/g, '/').trim();
  if (raw.startsWith('/') || /^[a-zA-Z]:/.test(raw) || raw.includes('\0')) {
    throw new Error(`Đường dẫn không hợp lệ (phải là đường dẫn tương đối trong KB): ${relativePath}`);
  }
  const segments = raw.split('/').filter(s => s && s !== '.');
  if (segments.includes('..')) {
    throw new Error(`Đường dẫn không được chứa "..": ${relativePath}`);
  }
  if (segments[0] === '.git') {
    throw new Error(`Không được truy cập .git: ${relativePath}`);
  }
  return segments.join('/');
}

/** Commit metadata for providers that create commits per write (GitHub) */
export interface WriteMeta {
  message?: string;
  author?: { name: string; email: string };
}

/**
 * Parsed markdown file result.
 */
export interface ParsedMarkdown {
  frontmatter: Record<string, any>;
  content: string;
}

/**
 * File entry in a directory listing.
 */
export interface FileEntry {
  path: string;
  name: string;
  isDirectory: boolean;
}

/**
 * Abstract data provider for KB file operations.
 */
export interface DataProvider {
  /**
   * Reads a file and returns its raw content.
   * @param relativePath - Path relative to KB root.
   * @returns File content as string, or null if not found.
   */
  readFile(relativePath: string): Promise<string | null>;

  /**
   * Writes content to a file, creating directories as needed.
   * @param relativePath - Path relative to KB root.
   * @param content - File content to write.
   * @param meta - Commit message/author (used by GitHubProvider, ignored locally).
   */
  writeFile(relativePath: string, content: string, meta?: WriteMeta): Promise<void>;

  /**
   * Lists files in a directory, optionally filtered by extension.
   * @param dirPath - Directory path relative to KB root.
   * @param pattern - Optional glob pattern (e.g. '*.md').
   * @returns Array of relative file paths.
   */
  listFiles(dirPath: string, pattern?: string): Promise<string[]>;

  /**
   * Checks if a file or directory exists.
   * @param relativePath - Path relative to KB root.
   * @returns True if exists.
   */
  fileExists(relativePath: string): Promise<boolean>;

  /**
   * Deletes a file.
   * @param relativePath - Path relative to KB root.
   */
  deleteFile(relativePath: string, meta?: WriteMeta): Promise<void>;
}

/**
 * Wraps a provider so every write carries the given author (HTTP mode: one wrapper per authenticated user).
 */
export function withAuthor(base: DataProvider, author: WriteMeta['author']): DataProvider {
  return {
    readFile: p => base.readFile(p),
    listFiles: (d, pattern) => base.listFiles(d, pattern),
    fileExists: p => base.fileExists(p),
    writeFile: (p, c, meta) => base.writeFile(p, c, { ...meta, author: meta?.author ?? author }),
    deleteFile: (p, meta) => base.deleteFile(p, { ...meta, author: meta?.author ?? author }),
  };
}
