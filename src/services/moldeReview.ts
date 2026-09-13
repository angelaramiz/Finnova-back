// TASK-R2-2 (Revisor de moldes, Fase 2). Servicio del endpoint
// POST /api/moldes/:id/review + override. Cero LLM.
//
// AUTOCONTENIDO A PROPOSITO: el backend en prod corre con
// rootDir=backend (render.yaml) y NO ve alumnos/. Por eso las Capas 1 y 2
// estan VENDOREADAS aqui (copias exactas de alumnos/src/lib/revisorMoldes.ts
// y alumnos/src/lib/scoreMoldes.ts). Test guardián contra divergencia:
// tests/moldes-drift.test.ts (falla si alguna copia cambia sin la otra).

// ---- Capa 1 vendoreada (de revisorMoldes.ts) ----
const CLAVES_MOLDE = ['titulo', 'instructor', 'duracion', 'duracionTxt', 'capitulos', 'segmentos'];
const CLAVES_CAP = ['titulo', 'inicio'];
const CLAVES_SEG = ['start', 'end', 'text'];

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validateMolde(molde: unknown): string[] {
  const errores: string[] = [];
  if (!esObjeto(molde)) {
    return ['molde: debe ser un objeto'];
  }
  const claves = Object.keys(molde);
  for (const k of claves) {
    if (!CLAVES_MOLDE.includes(k)) errores.push(`molde: clave inesperada '${k}'`);
  }
  for (const k of CLAVES_MOLDE) {
    if (!(k in molde)) errores.push(`molde: falta clave '${k}'`);
  }
  if (typeof molde.titulo !== 'string' || !molde.titulo.trim()) {
    errores.push('molde: titulo debe ser texto no vacio');
  }
  if (typeof molde.instructor !== 'string' || !molde.instructor.trim()) {
    errores.push('molde: instructor debe ser texto no vacio');
  }
  if (typeof molde.duracion !== 'number' || !(molde.duracion > 0)) {
    errores.push('molde: duracion debe ser numero > 0');
  }
  if (typeof molde.duracionTxt !== 'string' || !molde.duracionTxt.trim()) {
    errores.push('molde: duracionTxt debe ser texto no vacio');
  }

  const duracion = typeof molde.duracion === 'number' ? molde.duracion : 0;

  if (!Array.isArray(molde.capitulos) || molde.capitulos.length < 5) {
    errores.push('molde: capitulos debe ser arreglo con >= 5');
  }
  if (!Array.isArray(molde.segmentos) || molde.segmentos.length === 0) {
    errores.push('molde: segmentos debe ser arreglo no vacio');
  }

  const segmentos: Record<string, unknown>[] = Array.isArray(molde.segmentos)
    ? (molde.segmentos as Record<string, unknown>[])
    : [];
  segmentos.forEach((s, j) => {
    const ruta = `segmentos[${j}]`;
    if (!esObjeto(s)) {
      errores.push(`${ruta}: debe ser un objeto`);
      return;
    }
    for (const k of Object.keys(s)) {
      if (![...CLAVES_SEG, 'speaker'].includes(k)) errores.push(`${ruta}: clave inesperada '${k}'`);
    }
    if (typeof s.start !== 'number' || typeof s.end !== 'number' || typeof s.text !== 'string') {
      errores.push(`${ruta}: tipos {start, end: number; text: string}`);
      return;
    }
    if (s.start < 0) errores.push(`${ruta}: start < 0`);
    if (s.start > (s.end as number)) errores.push(`${ruta}: start > end`);
    if (!(s.text as string).trim()) errores.push(`${ruta}: text vacio`);
    if (j > 0) {
      const prev = segmentos[j - 1];
      if (esObjeto(prev) && typeof prev.start === 'number' && (s.start as number) < prev.start) {
        errores.push(`${ruta}: fuera de orden por start`);
      }
    }
  });

  if (Array.isArray(molde.capitulos)) {
    (molde.capitulos as Record<string, unknown>[]).forEach((c, i) => {
      const ruta = `capitulos[${i}]`;
      if (!esObjeto(c)) {
        errores.push(`${ruta}: debe ser un objeto`);
        return;
      }
      for (const k of Object.keys(c)) {
        if (!CLAVES_CAP.includes(k)) errores.push(`${ruta}: clave inesperada '${k}'`);
      }
      if (typeof c.titulo !== 'string' || !c.titulo.trim()) {
        errores.push(`${ruta}: titulo debe ser texto no vacio`);
      }
      if (typeof c.inicio !== 'number') {
        errores.push(`${ruta}: inicio debe ser numero`);
        return;
      }
      if (c.inicio < 0 || c.inicio > duracion) {
        errores.push(`${ruta}: inicio fuera de [0, duracion]`);
        return;
      }
      const anclado = segmentos.some(
        (s) => esObjeto(s) && typeof s.start === 'number' && Math.abs((s.start as number) - (c.inicio as number)) < 1,
      );
      if (!anclado) errores.push(`${ruta}: inicio a >= 1s de todo segmento real`);
    });
  }

  return errores;
}

// ---- Capa 2 vendoreada (de scoreMoldes.ts) ----
export interface JustificacionCriterio {
  criterio: 'cobertura' | 'claridad' | 'tono_forma' | 'duracion_ritmo';
  puntaje: number;
  max: number;
  notas: string[];
}

export interface ResultadoScore {
  score: number;
  justificacion: JustificacionCriterio[];
}

function red1(n: number): number {
  return Math.round(n * 10) / 10;
}

const HUECO_MAX_S = 1200;
const TITULO_MIN = 15;
const CAP_MIN_S = 180;
const CAP_MAX_S = 900;
const Q_UMBRAL = 0.35;
const TINY_UMBRAL = 0.3;
const TINY_S = 2;

export function scoreMolde(molde: unknown): ResultadoScore {
  if (!esObjeto(molde)) {
    const nota = 'molde: entrada invalida (no es objeto)';
    return {
      score: 0,
      justificacion: (['cobertura', 'claridad', 'tono_forma', 'duracion_ritmo'] as const).map(
        (criterio) => ({ criterio, puntaje: 0, max: 0, notas: [nota] }),
      ),
    };
  }
  const caps: Record<string, unknown>[] = Array.isArray(molde.capitulos)
    ? (molde.capitulos as Record<string, unknown>[])
    : [];
  const segs: Record<string, unknown>[] = Array.isArray(molde.segmentos)
    ? (molde.segmentos as Record<string, unknown>[])
    : [];
  const duracion = typeof molde.duracion === 'number' && molde.duracion > 0 ? molde.duracion : 0;

  const justificacion: JustificacionCriterio[] = [
    puntuarCobertura(caps, segs, duracion),
    puntuarClaridad(caps),
    puntuarTono(segs),
    puntuarRitmo(caps, duracion),
  ];
  const score = red1(Math.min(100, Math.max(0, justificacion.reduce((a, j) => a + j.puntaje, 0))));
  return { score, justificacion };
}

function limitesCapitulos(caps: Record<string, unknown>[], duracion: number): number[] {
  const inicios = caps
    .map((c) => (typeof c.inicio === 'number' ? (c.inicio as number) : NaN))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  const fin = duracion > 0 ? duracion : inicios.length > 0 ? inicios[inicios.length - 1] : 0;
  return [...inicios, fin];
}

function segmentosEn(segs: Record<string, unknown>[], desde: number, hasta: number): Record<string, unknown>[] {
  return segs.filter((s) => typeof s.start === 'number' && (s.start as number) >= desde && (s.start as number) < hasta);
}

function puntuarCobertura(
  caps: Record<string, unknown>[],
  segs: Record<string, unknown>[],
  duracion: number,
): JustificacionCriterio {
  const max = 35;
  const notas: string[] = [];
  let p = max;
  if (caps.length === 0 || segs.length === 0) {
    return { criterio: 'cobertura', puntaje: 0, max, notas: ['cobertura: sin capitulos o sin segmentos'] };
  }
  const bounds = limitesCapitulos(caps, duracion);
  caps.forEach((_, i) => {
    if (i + 1 >= bounds.length) return;
    const n = segmentosEn(segs, bounds[i], bounds[i + 1]).length;
    if (n === 0) {
      p -= 10;
      notas.push(`cobertura: capitulos[${i}] sin segmentos (-10)`);
    } else if (n === 1) {
      p -= 6;
      notas.push(`cobertura: capitulos[${i}] con 1 solo segmento (-6)`);
    }
  });
  const ordenados = segs
    .filter((s) => typeof s.start === 'number' && typeof s.end === 'number')
    .sort((a, b) => (a.start as number) - (b.start as number));
  ordenados.forEach((s, j) => {
    if (j === 0) return;
    const hueco = (s.start as number) - (ordenados[j - 1].end as number);
    if (hueco > HUECO_MAX_S) {
      p -= 8;
      notas.push(`cobertura: hueco de ${Math.round(hueco / 60)} min antes de segmentos[${j}] (-8)`);
    }
  });
  return { criterio: 'cobertura', puntaje: red1(Math.max(0, p)), max, notas };
}

function puntuarClaridad(caps: Record<string, unknown>[]): JustificacionCriterio {
  const max = 30;
  const notas: string[] = [];
  let p = max;
  if (caps.length === 0) {
    return { criterio: 'claridad', puntaje: 0, max, notas: ['claridad: sin capitulos'] };
  }
  const vistos = new Set<string>();
  caps.forEach((c, i) => {
    const t = typeof c.titulo === 'string' ? (c.titulo as string) : '';
    if (t.trim().length < TITULO_MIN) {
      p -= 4;
      notas.push(`claridad: capitulos[${i}] titulo < ${TITULO_MIN} caracteres (-4)`);
    }
    if (t && vistos.has(t)) {
      p -= 4;
      notas.push(`claridad: capitulos[${i}] titulo duplicado (-4)`);
    }
    if (t) vistos.add(t);
  });
  return { criterio: 'claridad', puntaje: red1(Math.max(0, p)), max, notas };
}

function puntuarTono(segs: Record<string, unknown>[]): JustificacionCriterio {
  const max = 15;
  const notas: string[] = [];
  if (segs.length === 0) {
    return { criterio: 'tono_forma', puntaje: 0, max, notas: ['tono_forma: sin segmentos'] };
  }
  const conSpeaker = segs.filter((s) => typeof s.speaker === 'string' && (s.speaker as string).trim()).length;
  const ratioSpeaker = conSpeaker / segs.length;
  let p = 10 + red1(ratioSpeaker * 5);
  if (ratioSpeaker === 0) notas.push('tono_forma: ningun segmento trae speaker (+0 de 5)');
  else if (ratioSpeaker < 1) notas.push(`tono_forma: speaker en ${Math.round(ratioSpeaker * 100)}%`);
  const conPregunta = segs.filter((s) => typeof s.text === 'string' && (s.text as string).includes('?')).length;
  const qRatio = conPregunta / segs.length;
  if (qRatio > Q_UMBRAL) {
    const pen = Math.min(5, red1((qRatio - Q_UMBRAL) * 100 * 0.4));
    p -= pen;
    notas.push(`tono_forma: exceso de "?" (${Math.round(qRatio * 100)}% de segmentos, -${pen})`);
  }
  const tiny = segs.filter(
    (s) => typeof s.start === 'number' && typeof s.end === 'number' && (s.end as number) - (s.start as number) < TINY_S,
  ).length;
  const tinyRatio = tiny / segs.length;
  if (tinyRatio > TINY_UMBRAL) {
    const pen = Math.min(5, red1((tinyRatio - TINY_UMBRAL) * 100 * 0.4));
    p -= pen;
    notas.push(`tono_forma: segmentos <${TINY_S}s en ${Math.round(tinyRatio * 100)}% (-${pen})`);
  }
  return { criterio: 'tono_forma', puntaje: red1(Math.min(max, Math.max(0, p))), max, notas };
}

function puntuarRitmo(caps: Record<string, unknown>[], duracion: number): JustificacionCriterio {
  const max = 20;
  const notas: string[] = [];
  if (caps.length === 0 || !(duracion > 0)) {
    return { criterio: 'duracion_ritmo', puntaje: 0, max, notas: ['duracion_ritmo: sin capitulos o sin duracion'] };
  }
  const bounds = limitesCapitulos(caps, duracion);
  let p = max;
  caps.forEach((_, i) => {
    if (i + 1 >= bounds.length) return;
    const dur = bounds[i + 1] - bounds[i];
    if (dur < CAP_MIN_S) {
      const pen = Math.min(3, red1(((CAP_MIN_S - dur) / CAP_MIN_S) * 3));
      p -= pen;
      notas.push(`duracion_ritmo: capitulos[${i}] de ${Math.round(dur)}s < 3 min (-${pen})`);
    } else if (dur > CAP_MAX_S) {
      const pen = Math.min(3, red1(((dur - CAP_MAX_S) / CAP_MAX_S) * 3));
      p -= pen;
      notas.push(`duracion_ritmo: capitulos[${i}] de ${Math.round(dur / 60)} min > 15 min (-${pen})`);
    }
  });
  return { criterio: 'duracion_ritmo', puntaje: red1(Math.max(0, p)), max, notas };
}

// ---- Review + veredicto + override ----

export type Veredicto = 'publica' | 'con-advertencias' | 'observado';

export interface OverrideRegistro {
  id: string;
  motivo: string;
  por: string;
  at: string;
}

export interface ReviewMolde {
  id: string;
  capa1: { ok: boolean; errores: string[] };
  capa2: ResultadoScore;
  veredicto: Veredicto;
  override?: OverrideRegistro;
}

const overrides: Record<string, OverrideRegistro> = {};

export function reviewMolde(id: string, molde: unknown): ReviewMolde {
  const errores = validateMolde(molde);
  const capa2 = scoreMolde(molde);
  const capa1Ok = errores.length === 0;
  let veredicto: Veredicto = 'con-advertencias';
  if (!capa1Ok || capa2.score < 50) veredicto = 'observado';
  else if (capa2.score >= 70) veredicto = 'publica';
  const override = overrides[id];
  return { id, capa1: { ok: capa1Ok, errores }, capa2, veredicto, ...(override ? { override } : {}) };
}

export function registerOverride(id: string, motivo: string, por: string): OverrideRegistro {
  if (!motivo || !motivo.trim()) throw new Error('override: motivo requerido');
  const reg: OverrideRegistro = { id, motivo: motivo.trim(), por: por || 'staff', at: new Date().toISOString() };
  overrides[id] = reg;
  console.info(`[moldes] override registrado: ${id} por ${reg.por} — ${reg.motivo}`);
  return reg;
}

export function getOverride(id: string): OverrideRegistro | undefined {
  return overrides[id];
}

export function clearOverrides(): void {
  for (const k of Object.keys(overrides)) delete overrides[k];
}
