import { describe, it, expect } from 'vitest';
import { buildDemoStudents } from '../routes/staff';

describe('staff — seguimiento de alumnos', () => {
  it('buildDemoStudents devuelve 3 alumnos con metadata completa', () => {
    const s = buildDemoStudents();
    expect(s).toHaveLength(3);
    for (const row of s) {
      expect(row.id).toBeTruthy();
      expect(row.name).toBeTruthy();
      expect(['data_engineering', 'accounting']).toContain(row.specialty);
      expect(row.total).toBeGreaterThan(0);
      expect(row.scorePct).toBeGreaterThanOrEqual(0);
      expect(row.scorePct).toBeLessThanOrEqual(100);
      expect(['recovered', 'failed']).toContain(row.world.pipeline);
      expect(['met', 'breached']).toContain(row.world.sla);
    }
  });

  it('incluye alumnos de ambas especialidades', () => {
    const specs = new Set(buildDemoStudents().map(s => s.specialty));
    expect(specs).toEqual(new Set(['data_engineering', 'accounting']));
  });
});
