// Endpoints /polizas del motor de asientos (TDD conductual: supertest real).
import { describe, it, expect, beforeAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

process.env.ALLOW_MOCK_AUTH = 'true';

vi.mock('../lib/supabaseClient', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
      insert: () => Promise.resolve({ data: [], error: null }),
    }),
  },
  isSupabaseReady: () => false,
}));

let app: express.Express;

beforeAll(async () => {
  // Router directo (sin importar server: evita el segundo app.listen).
  const { simEngineRouter } = await import('./simEngine');
  app = express();
  app.use(express.json());
  app.use('/api/sim', simEngineRouter);
});

const MARCELO = {
  rfc: 'FOFM8406126X3', emisor: 'MARCELO F', fecha: '02-01-2025',
  uuid: '1317D7E0-38AC-489F-9082-E75019D8975E', metodo: 'PUE',
  producto: 'Arrendamiento de residencias DEL 15 de enero al 14 de febrero del 2025',
  moneda: 'MXN', subtotal: 70900, iva16: 0, iva8: 0, ivaRet: 0, isrRet: 7090, total: 63810,
};
const EDO = [{ fecha: '02-01-2025', concepto: 'Arrendamiento', totalPagado: 63810, banco: 'RITO FINANCIERA' }];

describe('GET /api/sim/polizas/catalogo', () => {
  it('expone cuentas, equivalencias, bancos, monedas y métodos', async () => {
    const res = await request(app).get('/api/sim/polizas/catalogo');
    expect(res.status).toBe(200);
    expect(res.body.cuentas.length).toBeGreaterThan(30);
    expect(res.body.equivalencias).toContainEqual({ cuentaInterna: '601-83', agrupador: '601.45' });
    expect(res.body.bancos.map((b: { clave: string }) => b.clave)).toContain('021');
    expect(res.body.monedas.map((m: { codigo: string }) => m.codigo)).toContain('MXN');
    expect(res.body.metodos.map((m: { clave: string }) => m.clave)).toContain('03');
  });
});

describe('POST /api/sim/polizas/generar', () => {
  it('MARCELO F genera EGRESOS 70900=70900 sin errores', async () => {
    const res = await request(app).post('/api/sim/polizas/generar').send({ cfdi: MARCELO, edoCta: EDO });
    expect(res.status).toBe(200);
    expect(res.body.poliza.tipo).toBe('EGRESOS');
    expect(res.body.poliza.lineas).toHaveLength(3);
    expect(res.body.poliza.totalDebe).toBe(70900);
    expect(res.body.poliza.totalHaber).toBe(70900);
    expect(res.body.errores).toEqual([]);
  });

  it('rechaza CFDI sin uuid/producto con 400', async () => {
    const res = await request(app).post('/api/sim/polizas/generar').send({ cfdi: { subtotal: 1 } });
    expect(res.status).toBe(400);
  });

  it('retención mal timbrada devuelve errores con lección, no póliza', async () => {
    const mal = { ...MARCELO, isrRet: 7000, total: 63900 };
    const res = await request(app).post('/api/sim/polizas/generar').send({
      cfdi: mal, edoCta: [{ fecha: '02-01-2025', concepto: 'x', totalPagado: 63900, banco: 'RITO' }],
    });
    expect(res.status).toBe(200);
    expect(res.body.poliza).toBeNull();
    expect(res.body.errores[0].codigo).toBe('RET_ISR_ARRENDAMIENTO');
  });
});

describe('POST /api/sim/polizas/guardar', () => {
  const lineasOk = [
    { cuentaInterna: '601-83', agrupador: '601.45', descripcion: 'Arrendamiento', debe: 70900, haber: 0 },
    { cuentaInterna: '216-03', agrupador: '216.03', descripcion: 'ISR', debe: 0, haber: 7090 },
    { cuentaInterna: '102-01-002', agrupador: '102.01', descripcion: 'Bancos', debe: 0, haber: 63810 },
  ];
  const base = {
    tipo: 'EGRESOS', fecha: '02-01-2025', concepto: 'Arrendamiento', uuid: MARCELO.uuid,
    rfcTercero: MARCELO.rfc, montoTotal: 63810, moneda: 'MXN', metodoPago: '03',
    totalDebe: 70900, totalHaber: 70900,
  };

  it('guarda cuadrada con folio y alimenta diario + saldos', async () => {
    const res = await request(app).post('/api/sim/polizas/guardar').send({ poliza: { ...base, lineas: lineasOk } });
    expect(res.status).toBe(200);
    expect(res.body.folio).toMatch(/^POL-/);
    expect(res.body.totalDebe).toBe(res.body.totalHaber);
    const j = await request(app).get('/api/sim/journal');
    expect(j.status).toBe(200);
    const mias = j.body.filter((e: { uuid: string }) => e.uuid === MARCELO.uuid);
    expect(mias).toHaveLength(3);
    expect(mias[0].agrupador).toBe('601.45');
    const cat = await request(app).get('/api/sim/chart-of-accounts');
    const cta = cat.body.find((a: { code: string }) => a.code === '601-83');
    expect(cta.agrupador).toBe('601.45');
  });

  it('descuadrada se rechaza con 422', async () => {
    const mal = lineasOk.map((l, i) => (i === 2 ? { ...l, haber: 63000 } : l));
    const res = await request(app).post('/api/sim/polizas/guardar').send({ poliza: { ...base, lineas: mal } });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/descuadrada/);
  });

  it('línea sin agrupador SAT se rechaza con 422', async () => {
    const mal = [{ cuentaInterna: 'XXX-FANTASMA', agrupador: '', descripcion: 'x', debe: 100, haber: 0 },
      { cuentaInterna: '102-01-002', agrupador: '102.01', descripcion: 'Bancos', debe: 0, haber: 100 }];
    const res = await request(app).post('/api/sim/polizas/guardar').send({ poliza: { ...base, lineas: mal } });
    expect(res.status).toBe(422);
  });

  it('póliza sin líneas se rechaza con 400', async () => {
    const res = await request(app).post('/api/sim/polizas/guardar').send({ poliza: { ...base, lineas: [] } });
    expect(res.status).toBe(400);
  });

  it('PPD con tipo EGRESOS se rechaza con 422', async () => {
    const res = await request(app).post('/api/sim/polizas/guardar').send({
      poliza: { ...base, tipo: 'EGRESOS', lineas: lineasOk },
      fiscal: { uuid: 'D4E5F6A7-B8C9-4D0E-1F2A-B3C4D5E6F7A8', rfc: MARCELO.rfc, metodo: 'PPD', conciliado: false },
    });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/PROVISI/);
  });

  it('PUE sin conciliar con tipo EGRESOS se rechaza con 422', async () => {
    const res = await request(app).post('/api/sim/polizas/guardar').send({
      poliza: { ...base, tipo: 'EGRESOS', lineas: lineasOk },
      fiscal: { uuid: 'E5F6A7B8-C9D0-4E1F-2A3B-C4D5E6F7A8B9', rfc: MARCELO.rfc, metodo: 'PUE', conciliado: false },
    });
    expect(res.status).toBe(422);
  });

  it('RFC inválido se rechaza con 422', async () => {
    const res = await request(app).post('/api/sim/polizas/guardar').send({
      poliza: { ...base, lineas: lineasOk },
      fiscal: { uuid: 'F6A7B8C9-D0E1-4F2A-3B4C-D5E6F7A8B9C0', rfc: 'X', metodo: 'PUE', conciliado: true },
    });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/RFC/);
  });

  it('UUID duplicado se rechaza con 422 (ya guardado en memoria)', async () => {
    const res = await request(app).post('/api/sim/polizas/guardar').send({
      poliza: { ...base, lineas: lineasOk },
      fiscal: { uuid: MARCELO.uuid, rfc: MARCELO.rfc, metodo: 'PUE', conciliado: true },
    });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/duplic/i);
  });

  it('601.83 conviviendo con 118.01 se rechaza con 422', async () => {
    const mal = [
      { cuentaInterna: '601-83', agrupador: '601.83', descripcion: 'No deducible', debe: 5800, haber: 0 },
      { cuentaInterna: '118-01', agrupador: '118.01', descripcion: 'IVA', debe: 800, haber: 0 },
      { cuentaInterna: '102-01-002', agrupador: '102.01', descripcion: 'Bancos', debe: 0, haber: 6600 },
    ];
    const res = await request(app).post('/api/sim/polizas/guardar').send({ poliza: { ...base, lineas: mal } });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/601\.83/);
  });
});
