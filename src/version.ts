// version.ts — NADA hardcodeado de build. Resolución dinámica:
// 1. RENDER_GIT_COMMIT (Render lo inyecta en cada deploy) o BUILD_HASH.
// 2. git rev-parse local (dev con repo).
// 3. 'dev' (sin repo ni env).
// BUILD_TIME = arranque del proceso (honesto: refleja el boot del deploy).
import { execSync } from 'child_process';

function resolveHash(): string {
  const fromEnv = process.env.RENDER_GIT_COMMIT || process.env.BUILD_HASH || '';
  if (fromEnv.trim()) return fromEnv.trim().slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { timeout: 3000 })
      .toString()
      .trim()
      .slice(0, 7);
  } catch {
    return 'dev';
  }
}

export const VERSION = '0.1.49';
export const BUILD_HASH = resolveHash();
export const BUILD_BRANCH = process.env.RENDER_GIT_BRANCH || process.env.BRANCH || 'main';
export const BUILD_TIME = new Date().toISOString();
