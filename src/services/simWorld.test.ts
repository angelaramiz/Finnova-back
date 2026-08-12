import { describe, it, expect } from 'vitest';
import { getWorld, resetWorld, addAction, recoverIncident } from '../services/simWorld';

describe('simWorld — estado global del simulador DE', () => {
  it('inicializa el mundo con el incidente del 05-jul en falla', async () => {
    const w = await resetWorld('u-1');
    expect(w.pipeline.dagId).toBe('lno_sales_pipeline');
    expect(w.pipeline.status).toBe('failed');
    expect(w.pipeline.failedTask).toBe('dbt_test');
    expect(w.pipeline.failedTest).toContain('total_ventas');
    expect(w.slas.mrtSla).toBe('breached');
  });

  it('getWorld devuelve el mismo estado por usuario', async () => {
    await resetWorld('u-2');
    const w1 = await getWorld('u-2');
    w1.actions.push({ at: 'x', type: 't', detail: 'd' });
    expect((await getWorld('u-2')).actions.length).toBe(2);
  });

  it('los usuarios tienen mundos independientes', async () => {
    await resetWorld('u-3');
    await resetWorld('u-4');
    await recoverIncident('u-3');
    expect((await getWorld('u-3')).pipeline.status).toBe('recovered');
    expect((await getWorld('u-4')).pipeline.status).toBe('failed');
  });

  it('recoverIncident marca el pipeline verde y el SLA cumplido, y registra la acción', async () => {
    await resetWorld('u-5');
    const before = (await getWorld('u-5')).actions.length;
    const w = await recoverIncident('u-5');
    expect(w.pipeline.status).toBe('recovered');
    expect(w.slas.mrtSla).toBe('met');
    expect(w.actions.length).toBe(before + 1);
    expect(w.actions[w.actions.length - 1].type).toBe('incident_recovery');
  });

  it('addAction registra y mantiene un máximo de 50', async () => {
    await resetWorld('u-6');
    for (let i = 0; i < 60; i++) await addAction('u-6', 'a', `accion-${i}`);
    expect((await getWorld('u-6')).actions.length).toBeLessThanOrEqual(50);
  });
});
