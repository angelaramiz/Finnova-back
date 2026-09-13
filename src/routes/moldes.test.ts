import { describe, it, expect, beforeEach } from 'vitest';
import {
  reviewMolde,
  registerOverride,
  getOverride,
  clearOverrides,
} from '../services/moldeReview';
import auditoria from '../../../alumnos/src/data/capacitaciones/auditoria.json';

// TASK-R2-2: POST /api/moldes/:id/review (Capa1 + Capa2 + veredicto)
// + POST /api/moldes/:id/override (quien/cuando/porque). Cero LLM.

function moldeSano() {
  const inicios = [0, 240, 480, 720, 960];
  return {
    titulo: 'Molde sintetico',
    instructor: 'Instructor',
    duracion: 1200,
    duracionTxt: '20:00',
    capitulos: inicios.map((inicio, i) => ({ titulo: `Capitulo numero ${i + 1} con titulo largo`, inicio })),
    segmentos: inicios.flatMap((b) => [
      { start: b, end: b + 10, speaker: 'A', text: 'Punto uno.' },
      { start: b + 12, end: b + 22, speaker: 'A', text: 'Punto dos.' },
      { start: b + 24, end: b + 34, speaker: 'A', text: 'Punto tres.' },
    ]),
  };
}

beforeEach(() => clearOverrides());

describe('moldeReview (endpoint review + override)', () => {
  it('molde sano => publica con capa1 ok y capa2 justificada', () => {
    const r = reviewMolde('sano', moldeSano());
    expect(r.capa1.ok).toBe(true);
    expect(r.capa1.errores).toEqual([]);
    expect(r.capa2.score).toBeGreaterThanOrEqual(70);
    expect(r.capa2.justificacion).toHaveLength(4);
    expect(r.veredicto).toBe('publica');
  });

  it('molde real auditoria => publica', () => {
    const r = reviewMolde('auditoria', auditoria);
    expect(r.capa1.ok).toBe(true);
    expect(r.veredicto).toBe('publica');
  });

  it('score 50-69 => con-advertencias', () => {
    // 5 capitulos cortos (ritmo -8.2), 1 seg/cap en 4 de ellos
    // (cobertura -24), sin speaker (tono 10): total ~62.8
    const m = {
      titulo: 'Molde medio',
      instructor: 'Instructor',
      duracion: 1200,
      duracionTxt: '20:00',
      capitulos: [0, 60, 120, 180, 240].map((inicio, i) => ({
        titulo: `Capitulo numero ${i + 1} con titulo largo`,
        inicio,
      })),
      segmentos: [
        { start: 0, end: 10, text: 'Uno.' },
        { start: 60, end: 70, text: 'Dos.' },
        { start: 120, end: 130, text: 'Tres.' },
        { start: 180, end: 190, text: 'Cuatro.' },
        { start: 240, end: 250, text: 'Cinco a.' },
        { start: 252, end: 262, text: 'Cinco b.' },
        { start: 264, end: 274, text: 'Cinco c.' },
      ],
    };
    const r = reviewMolde('medio', m);
    expect(r.capa2.score).toBeGreaterThanOrEqual(50);
    expect(r.capa2.score).toBeLessThan(70);
    expect(r.veredicto).toBe('con-advertencias');
  });

  it('capa1 con errores => observado aunque el score sea alto', () => {
    const m = moldeSano() as Record<string, unknown>;
    delete m.instructor;
    const r = reviewMolde('roto', m);
    expect(r.capa1.ok).toBe(false);
    expect(r.veredicto).toBe('observado');
  });

  it('score < 50 => observado', () => {
    const r = reviewMolde('vacio', { titulo: 'x' });
    expect(r.capa2.score).toBeLessThan(50);
    expect(r.veredicto).toBe('observado');
  });

  it('override registra quien/cuando/porque y aparece en el review', () => {
    const o = registerOverride('auditoria', 'Lo reviso manual antes de publicar', 'staff@finnova.mx');
    expect(o.id).toBe('auditoria');
    expect(o.motivo).toContain('manual');
    expect(o.por).toBe('staff@finnova.mx');
    expect(o.at).toBeTruthy();
    expect(getOverride('auditoria')).toEqual(o);
    const r = reviewMolde('auditoria', auditoria);
    expect(r.override?.motivo).toContain('manual');
    // el override no falsifica el veredicto calculado
    expect(r.veredicto).toBe('publica');
  });

  it('override sin motivo lanza error', () => {
    expect(() => registerOverride('x', '  ', 'staff@finnova.mx')).toThrow();
  });
});
