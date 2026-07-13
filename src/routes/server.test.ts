import { describe, it, expect, beforeAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../lib/supabaseClient', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        limit: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
  isSupabaseReady: () => false,
}));

let app: express.Express;

beforeAll(async () => {
  const mod = await import('../server');
  app = mod.app;
});

describe('GET /', () => {
  it('devuelve 404 en desarrollo (sin build de frontend)', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/health', () => {
  it('devuelve status ok y timestamp', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('devuelve db status (ok o skipped)', async () => {
    const res = await request(app).get('/api/health');
    expect(['ok', 'skipped', 'error']).toContain(res.body.db);
  });
});

describe('GET /api/health/email-queue', () => {
  it('devuelve estado de la cola de correos', async () => {
    const res = await request(app).get('/api/health/email-queue');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('queue');
  });
});

describe('404', () => {
  it('devuelve 404 para rutas inexistentes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
