/**
 * LocalProvider — Filesystem-based DataProvider implementation.
 *
 * Used in stdio mode when KB files are available on local disk.
 */

import fs from 'fs';
import path from 'path';
import { safeRelPath, type DataProvider } from './dataProvider.js';

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist']);

/**
 * Provides KB data access via local filesystem.
 */
export class LocalProvider implements DataProvider {
  private kbRoot: string;

  /**
   * @param kbRoot - Absolute path to KB root directory.
   */
  constructor(kbRoot: string) {
    this.kbRoot = path.resolve(kbRoot);
  }

  /** Absolute path inside the KB root; throws on anything that would escape it */
  private full(relativePath: string): string {
    const fullPath = path.resolve(this.kbRoot, safeRelPath(relativePath));
    const rel = path.relative(this.kbRoot, fullPath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`Đường dẫn nằm ngoài KB: ${relativePath}`);
    }
    return fullPath;
  }

  /**
   * Reads a file from local filesystem.
   * @param relativePath - Path relative to KB root.
   * @returns File content or null if not found.
   */
  async readFile(relativePath: string): Promise<string | null> {
    try {
      const fullPath = this.full(relativePath);
      if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return null;
      return fs.readFileSync(fullPath, 'utf8');
    } catch (error: any) {
      console.error(`[LocalProvider.readFile] Error reading ${relativePath}:`, error.message);
      return null;
    }
  }

  /**
   * Writes content to a file on local filesystem.
   * @param relativePath - Path relative to KB root.
   * @param content - Content to write.
   */
  async writeFile(relativePath: string, content: string): Promise<void> {
    const fullPath = this.full(relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
  }

  /**
   * Lists files in a directory, optionally filtered by extension.
   * @param dirPath - Directory relative to KB root.
   * @param pattern - Optional extension filter (e.g. '*.md').
   * @returns Array of relative file paths.
   */
  async listFiles(dirPath: string, pattern?: string): Promise<string[]> {
    const relDir = safeRelPath(dirPath);
    const fullDir = this.full(relDir);
    if (!fs.existsSync(fullDir)) return [];

    const ext = pattern?.replace('*', '') || '';
    const files: string[] = [];
    const walk = (rel: string) => {
      for (const entry of fs.readdirSync(path.join(fullDir, rel), { withFileTypes: true })) {
        const child = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          if (!IGNORED_DIRS.has(entry.name)) walk(child);
        } else if (!ext || entry.name.endsWith(ext)) {
          files.push(child);
        }
      }
    };
    walk('');

    return files.map((f) => (relDir ? `${relDir}/${f}` : f));
  }

  /**
   * Checks if a path exists on local filesystem.
   * @param relativePath - Path relative to KB root.
   * @returns True if exists.
   */
  async fileExists(relativePath: string): Promise<boolean> {
    try {
      return fs.existsSync(this.full(relativePath));
    } catch {
      return false;
    }
  }

  /**
   * Deletes a file on local filesystem.
   * @param relativePath - Path relative to KB root.
   */
  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = this.full(relativePath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      fs.unlinkSync(fullPath);
    }
  }
}
