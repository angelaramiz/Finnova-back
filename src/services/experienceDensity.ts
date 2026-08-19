// ─── Experience Density — Etapa 3 (R-10 v2 T6) ───────────────
// Mide la densidad de experiencia del alumno: CASOS resueltos,
// complejidad, variedad, incidentes y resultados — independiente de
// los años calendario. La narrativa del producto:
//   "La experiencia no se mide solo en años: un año resolviendo casos
//    variados puede superar a tres haciendo lo básico."
//
// density = f(casos, complejidad, variedad, incidentes, resultados)
// Normalizada a 0-1 (0.5+ ≈ "1 año de experiencia comprobable").

export interface DensityInput {
  casosResueltos: number;      // casos aplicados completados
  complejidad: number;         // 0-100 promedio de dificultad
  variedad: number;            // nº de skills/herramientas distintas tocadas
  incidentes: number;          // incidentes recuperados
  resultados: number;          // nº de entregables con golden validado
}

export interface DensityResult {
  density: number;             // 0-1
  density_pct: number;         // 0-100
  nivel: 'novato' | 'junior' | 'semi-senior' | 'senior';
  anos_equivalentes: number;   // años calendario que representa
  evidencia: string[];         // bullets para el expediente (R-08)
  narrativa: string;
}

const NARRATIVA =
  'La experiencia no se mide solo en años: un año resolviendo casos variados puede superar a tres haciendo lo básico.';

export function computeDensity(input: DensityInput): DensityResult {
  // Peso: casos (40%), complejidad (20%), variedad (15%), incidentes (15%), resultados (10%)
  const casos = Math.min(1, input.casosResueltos / 40);          // 40 casos ≈ pleno
  const complejidad = input.complejidad / 100;
  const variedad = Math.min(1, input.variedad / 10);             // 10 skills ≈ pleno
  const incidentes = Math.min(1, input.incidentes / 3);          // 3 incidentes ≈ pleno
  const resultados = Math.min(1, input.resultados / 40);

  const density = Math.min(1, Math.max(0,
    0.40 * casos +
    0.20 * complejidad +
    0.15 * variedad +
    0.15 * incidentes +
    0.10 * resultados
  ));

  const density_pct = Math.round(density * 100);
  const nivel = density < 0.25 ? 'novato' : density < 0.5 ? 'junior' : density < 0.75 ? 'semi-senior' : 'senior';
  const anos_equivalentes = Math.round(density * 3 * 10) / 10; // density 1 ≈ 3 años

  const evidencia = [
    `${input.casosResueltos} casos aplicados resueltos`,
    `${input.incidentes} incidentes recuperados en producción simulada`,
    `${input.variedad} herramientas/skills distintos practicados`,
    `${input.resultados} entregables con resultado validado por motor`,
  ];

  return { density, density_pct, nivel, anos_equivalentes, evidencia, narrativa: NARRATIVA };
}

// Conveniencia: densidad desde datos de progreso (sim_progress).
export function densityFromProgress(casosResueltos: number, incidentes: number, skillsTocados: number, dificultadPromedio: number, entregables: number): DensityResult {
  return computeDensity({
    casosResueltos,
    complejidad: dificultadPromedio,
    variedad: skillsTocados,
    incidentes,
    resultados: entregables,
  });
}