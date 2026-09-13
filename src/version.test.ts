// version.ts dinámico: hash desde env, git local o 'dev'. Sin hardcode.
import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.resetModules();
  delete process.env.RENDER_GIT_COMMIT;
  delete process.env.BUILD_HASH;
});

describe('version dinámica', () => {
  it('expone hash no vacío (git local o dev)', async () => {
    const v = await import('./version');
    expect(typeof v.BUILD_HASH).toBe('string');
    expect(v.BUILD_HASH.length).toBeGreaterThan(0);
    expect(v.BUILD_TIME).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('RENDER_GIT_COMMIT manda (7 chars)', async () => {
    process.env.RENDER_GIT_COMMIT = 'f3a5b17a3af77088b734687cc9304f5a49d9018e';
    const v = await import('./version');
    expect(v.BUILD_HASH).toBe('f3a5b17');
  });

  it('BUILD_HASH alterno manda si no hay RENDER_*', async () => {
    process.env.BUILD_HASH = 'abc1234';
    const v = await import('./version');
    expect(v.BUILD_HASH).toBe('abc1234');
  });
});
