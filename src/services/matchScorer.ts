// ─── Match Scorer — Etapa 1 (R-10 v2) ─────────────────────────
// Puntúa la compatibilidad del alumno contra los skills de la vacante.
// Lógica PURA (sin IO) para poder testearla. El perfil del alumno se
// construye con skillProfile (sim_progress real) y la vacante aporta
// skills detectados con pesos.

export interface VacancySkill {
  skill: string;
  required: boolean;
  weight: number;        // 0-1 (importancia en la vacante)
}

export interface MatchBreakdown {
  [skill: string]: {
    score: number;       // 0-100 dominio del alumno en ese skill
    weight: number;
    contribution: number; // score * weight (ponderado)
  };
}

export interface MatchResult {
  match_pct: number;     // 0-100 global ponderado
  breakdown: MatchBreakdown;
  top_gaps: string[];    // skills con peor score (para plan intensivo)
  covered: string[];     // skills con score >= 75
}

// Alinea un skill de la vacante con el perfil de habilidades del alumno.
const SKILL_ALIAS: Record<string, string[]> = {
  sql: ['sql', 'SQL'],
  excel: ['excel', 'hoja de calculo', 'spreadsheet'],
  dbt: ['dbt'],
  python: ['python', 'etl', 'pandas'],
  airflow: ['airflow', 'orquestacion'],
  etl: ['etl', 'python', 'pipeline'],
  bi: ['bi', 'looker', 'power bi', 'visualizacion'],
  cloud: ['cloud', 'aws', 's3', 'redshift'],
  cfdi: ['facturacion', 'cfdi', 'facturacion CFDI'],
  conciliacion: ['conciliacion', 'conciliacion bancaria'],
  nomina: ['nomina'],
  fiscal: ['fiscal', 'iva'],
  contabilidad: ['contabilidad', 'contable'],
  'calidad de datos': ['calidad', 'calidad de datos'],
  'resolucion de incidentes': ['resolucion', 'resolucion de incidentes', 'incidentes'],
};

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Busca el score del alumno para un skill de la vacante en su perfil.
function skillScore(profileSkills: { id: string; label: string; score: number }[], vacanteSkill: string): number {
  const aliases = SKILL_ALIAS[normalize(vacanteSkill)] || [vacanteSkill, normalize(vacanteSkill)];
  for (const alias of aliases) {
    const al = normalize(alias);
    for (const p of profileSkills) {
      if (normalize(p.label).includes(al) || normalize(p.id).includes(al) || al.includes(normalize(p.label))) {
        return p.score;
      }
    }
  }
  return 0; // sin evidencia → 0
}

export function computeMatch(profileSkills: { id: string; label: string; score: number }[], vacancySkills: VacancySkill[]): MatchResult {
  const weighted: MatchBreakdown = {};
  let totalWeight = 0;
  let acc = 0;

  for (const vs of vacancySkills) {
    const score = skillScore(profileSkills, vs.skill);
    const contribution = score * vs.weight;
    weighted[vs.skill] = { score, weight: vs.weight, contribution };
    totalWeight += vs.weight;
    acc += contribution;
  }

  // Si no hay skills detectados, match 0 (no se puede evaluar).
  const match_pct = totalWeight > 0 ? Math.round(acc / totalWeight) : 0;

  const entries = Object.entries(weighted).sort((a, b) => a[1].score - b[1].score);
  const top_gaps = entries.filter(([, v]) => v.score < 75 && v.weight > 0).map(([k]) => k).slice(0, 5);
  const covered = entries.filter(([, v]) => v.score >= 75).map(([k]) => k);

  return { match_pct, breakdown: weighted, top_gaps, covered };
}

export const UMBRAL_MODO_A = 75;