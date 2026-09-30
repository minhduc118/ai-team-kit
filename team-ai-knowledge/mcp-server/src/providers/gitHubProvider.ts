/**
 * GitHubProvider — GitHub API-based DataProvider implementation.
 *
 * Used in HTTP mode when KB files are stored in a GitHub repository.
 * Includes in-memory cache to minimize API calls.
 */

import { safeRelPath, type DataProvider, type WriteMeta } from './dataProvider.js';

const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

/** Cache entry with TTL tracking */
interface CacheEntry {
  data: any;
  expiry: number;
}

/** GitHub API file content response */
interface GitHubContentResponse {
  name: string;
  path: string;
  sha: string;
  content?: string;
  encoding?: string;
  type: 'file' | 'dir';
}

/** GitHub tree response entry */
interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
}

/** Configuration for GitHubProvider */
export interface GitHubProviderConfig {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
  cacheTtlMs?: number;
}

/** Default cache TTL: 5 minutes */
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Provides KB data access via GitHub REST API with caching.
 */
export class GitHubProvider implements DataProvider {
  private token: string;
  private owner: string;
  private repo: string;
  private branch: string;
  private cacheTtlMs: number;
  private cache: Map<string, CacheEntry> = new Map();
  private fileTreeCache: string[] | null = null;
  private fileTreeExpiry: number = 0;

  /**
   * @param config - GitHub API configuration.
   */
  constructor(config: GitHubProviderConfig) {
    this.token = config.token;
    this.owner = config.owner;
    this.repo = config.repo;
    this.branch = config.branch || 'main';
    this.cacheTtlMs = config.cacheTtlMs || DEFAULT_CACHE_TTL;
  }

  /**
   * Makes an authenticated request to GitHub API.
   * @param endpoint - API endpoint path (after /repos/owner/repo).
   * @param options - Fetch options.
   * @returns Parsed JSON response.
   */
  private async githubFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      const body = await response.text();
      throw new Error(`GitHub API error ${response.status}: ${body}`);
    }

    return response.json();
  }

  /**
   * Gets a value from cache if not expired.
   * @param key - Cache key.
   * @returns Cached value or null.
   */
  private getCached(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Sets a value in cache with TTL.
   * @param key - Cache key.
   * @param data - Data to cache.
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.cacheTtlMs,
    });
  }

  /**
   * Invalidates cache entries matching a prefix.
   * @param prefix - Path prefix to invalidate.
   */
  private invalidateCache(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
    // Also invalidate file tree so new files show up
    this.fileTreeCache = null;
  }

  /**
   * Reads a file from GitHub repository.
   * @param relativePath - Path relative to repo root.
   * @returns File content or null if not found.
   */
  async readFile(relativePath: string): Promise<string | null> {
    let normalized: string;
    try {
      normalized = safeRelPath(relativePath);
    } catch (error: any) {
      console.error(`[GitHubProvider.readFile] ${error.message}`);
      return null;
    }
    const cached = this.getCached(`file:${normalized}`);
    if (cached !== null) return cached;

    try {
      const data: GitHubContentResponse | null = await this.githubFetch(
        `/contents/${encodePath(normalized)}?ref=${this.branch}`
      );

      if (!data || data.type !== 'file' || !data.content) return null;

      const content = Buffer.from(data.content, 'base64').toString('utf8');
      this.setCache(`file:${normalized}`, content);
      return content;
    } catch (error: any) {
      console.error(`[GitHubProvider.readFile] Error reading ${normalized}:`, error.message);
      return null;
    }
  }

  /**
   * Writes a file to GitHub repository (creates or updates).
   * @param relativePath - Path relative to repo root.
   * @param content - Content to write.
   */
  async writeFile(relativePath: string, content: string, meta: WriteMeta = {}): Promise<void> {
    const normalized = safeRelPath(relativePath);
    if (!normalized) throw new Error('Thiếu đường dẫn file');

    const body: Record<string, any> = {
      message: meta.message ?? `chore: auto-save ${normalized.split('/').pop()}`,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch: this.branch,
    };
    if (meta.author) {
      body.author = meta.author;
      body.committer = meta.author;
    }

    // A concurrent write changes the file SHA → GitHub answers 409/422; refetch the SHA and retry once
    for (let attempt = 0; ; attempt++) {
      const existing: GitHubContentResponse | null = await this.githubFetch(
        `/contents/${encodePath(normalized)}?ref=${this.branch}`
      ).catch(() => null);
      if (existing?.sha) body.sha = existing.sha;
      else delete body.sha;

      try {
        await this.githubFetch(`/contents/${encodePath(normalized)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        break;
      } catch (error: any) {
        if (attempt === 0 && /GitHub API error (409|422)/.test(error.message)) continue;
        throw error;
      }
    }

    this.setCache(`file:${normalized}`, content);
    this.invalidateCache('tree:');
  }

  /**
   * Lists files by fetching the full repository tree.
   * @param dirPath - Directory path relative to repo root.
   * @param pattern - Optional extension filter (e.g. '*.md').
   * @returns Array of relative file paths.
   */
  async listFiles(dirPath: string, pattern?: string): Promise<string[]> {
    const normalized = safeRelPath(dirPath);
    const allFiles = await this.getFileTree();

    const ext = pattern?.replace('*', '') || '';
    const prefix = normalized ? `${normalized}/` : '';

    return allFiles.filter((f) => {
      if (prefix && !f.startsWith(prefix)) return false;
      if (ext && !f.endsWith(ext)) return false;
      return true;
    });
  }

  /**
   * Checks if a file exists in the repository.
   * @param relativePath - Path relative to repo root.
   * @returns True if exists.
   */
  async fileExists(relativePath: string): Promise<boolean> {
    let normalized: string;
    try {
      normalized = safeRelPath(relativePath);
    } catch {
      return false;
    }
    const allFiles = await this.getFileTree();
    return allFiles.includes(normalized) || allFiles.some(f => f.startsWith(`${normalized}/`));
  }

  /**
   * Fetches and caches the full file tree of the repository.
   * @returns Array of all file paths in the repo.
   */
  private async getFileTree(): Promise<string[]> {
    if (this.fileTreeCache && Date.now() < this.fileTreeExpiry) {
      return this.fileTreeCache;
    }

    try {
      const data = await this.githubFetch(
        `/git/trees/${this.branch}?recursive=1`
      );

      if (!data || !data.tree) return [];

      const tree: string[] = data.tree
        .filter((entry: GitHubTreeEntry) => entry.type === 'blob')
        .map((entry: GitHubTreeEntry) => entry.path);

      this.fileTreeCache = tree;
      this.fileTreeExpiry = Date.now() + this.cacheTtlMs;
      return tree;
    } catch (error: any) {
      console.error('[GitHubProvider.getFileTree] Error:', error.message);
      return [];
    }
  }

  /**
   * Pre-warms the cache by loading essential KB files.
   * Called once on server startup.
   */
  async warmUp(): Promise<void> {
    console.error('[GitHubProvider] Warming up cache...');
    const essentialFiles = [
      'START_HERE.md',
      'KNOWLEDGE_MAP.md',
      'AGENTS.md',
    ];

    await this.getFileTree();

    const promises = essentialFiles.map((f) => this.readFile(f));
    await Promise.all(promises);

    console.error(`[GitHubProvider] Cache warmed: ${this.cache.size} entries`);
  }

  /**
   * Deletes a file from GitHub repository.
   * @param relativePath - Path relative to repo root.
   */
  async deleteFile(relativePath: string, meta: WriteMeta = {}): Promise<void> {
    const normalized = safeRelPath(relativePath);

    try {
      const existing: GitHubContentResponse | null = await this.githubFetch(
        `/contents/${encodePath(normalized)}?ref=${this.branch}`
      );
      if (!existing || !existing.sha) return;

      const body: Record<string, any> = {
        message: meta.message ?? `chore: auto-delete ${normalized.split('/').pop()}`,
        sha: existing.sha,
        branch: this.branch,
      };
      if (meta.author) {
        body.author = meta.author;
        body.committer = meta.author;
      }

      await this.githubFetch(`/contents/${encodePath(normalized)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      this.cache.delete(`file:${normalized}`);
      this.invalidateCache(`tree:`);
    } catch (error: any) {
      console.error(`[GitHubProvider.deleteFile] Error deleting ${normalized}:`, error.message);
    }
  }
}
