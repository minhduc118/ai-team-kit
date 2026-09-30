/**
 * Bearer-token auth for HTTP mode. Each token maps to a GitHub username, which becomes
 * the assignee / approver / commit author for that request.
 *
 *   MCP_AUTH_TOKENS="tokenA:minhduc118a,tokenB:des7240"
 *   MCP_ALLOW_ANONYMOUS=true   → skip auth (writes are attributed to the server token owner)
 */

import { createHash, timingSafeEqual } from 'crypto';

export interface AuthConfig {
  tokens: Map<string, string>;
  anonymous: boolean;
}

const MIN_TOKEN_LENGTH = 16;

export function parseAuthTokens(raw: string | undefined): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const pair of (raw ?? '').split(',').map(s => s.trim()).filter(Boolean)) {
    const idx = pair.lastIndexOf(':');
    const token = idx > 0 ? pair.slice(0, idx).trim() : '';
    const user = idx > 0 ? pair.slice(idx + 1).trim() : '';
    if (!token || !user) throw new Error(`MCP_AUTH_TOKENS: mục "${pair}" phải có dạng token:githubUser`);
    if (token.length < MIN_TOKEN_LENGTH) throw new Error(`MCP_AUTH_TOKENS: token của ${user} phải dài ≥ ${MIN_TOKEN_LENGTH} ký tự`);
    tokens.set(token, user);
  }
  return tokens;
}

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const tokens = parseAuthTokens(env.MCP_AUTH_TOKENS);
  const anonymous = env.MCP_ALLOW_ANONYMOUS === 'true';
  if (!tokens.size && !anonymous) {
    throw new Error(
      'HTTP mode cần MCP_AUTH_TOKENS="token:githubUser,..." (hoặc MCP_ALLOW_ANONYMOUS=true nếu chấp nhận ai cũng gọi được).',
    );
  }
  return { tokens, anonymous };
}

const digest = (s: string) => createHash('sha256').update(s).digest();

/**
 * @returns the GitHub username for the request, null when anonymous access is allowed, or undefined when rejected.
 */
export function authenticate(header: string | undefined, config: AuthConfig): string | null | undefined {
  const presented = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (presented) {
    const d = digest(presented);
    for (const [token, user] of config.tokens) {
      if (timingSafeEqual(d, digest(token))) return user;
    }
    return config.anonymous ? null : undefined;
  }
  return config.anonymous ? null : undefined;
}
