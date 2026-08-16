// ─── Perfil de habilidades desempeñadas ────────────────────────
// Interpreta las completaciones del simulador (sim_progress) como
// dimensiones de habilidad. Alimenta el CV institucional y el radar
// del ProgressDashboard.

import { getRoleProgress } from './progressTracker';

export interface SkillScore {
  id: string;
  label: string;
  score: number;        // 0-100
  level: 'Básico' | 'Intermedio' | 'Avanzado';
}

export interface SkillProfile {
  specialty: string;
  branch: 'analyst' | 'engineering' | 'science' | 'accounting';
  skills: SkillScore[];
  overall: number;      // 0-100
  strengths: string[];
  gaps: string[];
}

// Mapeo taskType → dimensión de habilidad por rama.
const SKILL_MAP: Record<string, { dim: string; label: string }> = {
  // Data / Analista
  sql_query: { dim: 'sql', label: 'SQL' },
  data_quality: { dim: 'calidad', label: 'Calidad de datos' },
  soporte_datos: { dim: 'colaboracion', label: 'Colaboración' },
  // Ingeniería
  etl_pipeline: { dim: 'etl', label: 'Python / ETL' },
  ontology_modeling: { dim: 'modelado', label: 'Modelado' },
  airflow_dag: { dim: 'orquestacion', label: 'Orquestación' },
  code_review: { dim: 'codereview', label: 'Code review' },
  incident_recovery: { dim: 'resolucion', label: 'Resolución de incidentes' },
  // Ciencia
  eda_churn: { dim: 'eda', label: 'Análisis exploratorio (EDA)' },
  modelo_baseline: { dim: 'ml', label: 'Modelos ML' },
  eval_metricas: { dim: 'metricas', label: 'Métricas y evaluación' },
  // Contabilidad
  invoice_emission: { dim: 'facturacion', label: 'Facturación CFDI' },
  payment_registration: { dim: 'cobranza', label: 'Cobranza' },
  supplier_invoice: { dim: 'compras', label: 'Cuentas por pagar' },
  bank_reconciliation: { dim: 'conciliacion', label: 'Conciliación bancaria' },
  tax_calculation: { dim: 'fiscal', label: 'Fiscal / IVA' },
  payroll: { dim: 'nomina', label: 'Nómina' },
  journal_entry: { dim: 'contabilidad', label: 'Contabilidad' },
  credit_note: { dim: 'facturacion', label: 'Facturación CFDI' },
  cash_cut: { dim: 'caja', label: 'Caja' },
  payment_scheduling: { dim: 'tesoreria', label: 'Tesorería' },
  ap_reconciliation: { dim: 'conciliacion', label: 'Conciliación' },
  cfdi_reception: { dim: 'fiscal', label: 'Fiscal / CFDI' },
  financial_statements: { dim: 'reportes', label: 'Reportes financieros' },
  depreciation: { dim: 'activos', label: 'Activos fijos' },
};

function levelFor(score: number): 'Básico' | 'Intermedio' | 'Avanzado' {
  if (score >= 80) return 'Avanzado';
  if (score >= 60) return 'Intermedio';
  return 'Básico';
}

export async function buildSkillProfile(userId: string, specialty: string): Promise<SkillProfile> {
  const progress = await getRoleProgress(userId, specialty, 9999);
  const completions = progress.recentCompletions || [];

  // Acumular score por dimensión
  const byDim: Record<string, { sum: number; n: number; label: string }> = {};
  for (const c of completions) {
    const m = SKILL_MAP[c.taskType];
    if (!m) continue;
    if (!byDim[m.dim]) byDim[m.dim] = { sum: 0, n: 0, label: m.label };
    byDim[m.dim].sum += c.score;
    byDim[m.dim].n += 1;
  }

  const skills: SkillScore[] = Object.entries(byDim).map(([id, v]) => {
    const score = Math.round(v.sum / v.n);
    return { id, label: v.label, score, level: levelFor(score) };
  }).sort((a, b) => b.score - a.score);

  const overall = skills.length
    ? Math.round(skills.reduce((s, k) => s + k.score, 0) / skills.length)
    : progress.avgScore || 0;

  const strengths = skills.filter(s => s.score >= 75).map(s => s.label);
  const gaps = skills.filter(s => s.score < 60).map(s => s.label);

  const branch: SkillProfile['branch'] = specialty === 'accounting'
    ? 'accounting'
    : (completions.some(c => ['eda_churn', 'modelo_baseline', 'eval_metricas'].includes(c.taskType))
      ? 'science'
      : completions.some(c => ['etl_pipeline', 'airflow_dag', 'incident_recovery', 'code_review'].includes(c.taskType))
        ? 'engineering'
        : 'analyst');

  return { specialty, branch, skills, overall, strengths, gaps };
}

// ─── Perfil demo (modo DEMO) ──────────────────────────────────
// Genera un perfil "como si ya hubiera completado" la especialidad,
// para que el alumno pueda previsualizar el CV sin haber avanzado.
// No altera el progreso real (práctica, tareas, sims).

const DEMO_SKILLS: Record<string, { label: string; score: number }[]> = {
  analyst: [
    { label: 'SQL', score: 82 }, { label: 'Calidad de datos', score: 78 },
    { label: 'Colaboración', score: 74 }, { label: 'Modelado', score: 68 },
  ],
  engineering: [
    { label: 'SQL', score: 85 }, { label: 'Python / ETL', score: 80 },
    { label: 'Calidad de datos', score: 78 }, { label: 'Orquestación', score: 72 },
    { label: 'Code review', score: 76 }, { label: 'Resolución de incidentes', score: 70 },
  ],
  science: [
    { label: 'SQL', score: 84 }, { label: 'Análisis exploratorio (EDA)', score: 82 },
    { label: 'Modelos ML', score: 79 }, { label: 'Métricas y evaluación', score: 77 },
    { label: 'Calidad de datos', score: 75 },
  ],
  accounting: [
    { label: 'Facturación CFDI', score: 85 }, { label: 'Cobranza', score: 82 },
    { label: 'Fiscal / IVA', score: 80 }, { label: 'Conciliación bancaria', score: 78 },
    { label: 'Nómina', score: 76 }, { label: 'Reportes financieros', score: 79 },
  ],
};

const DEMO_STRENGTHS: Record<string, string[]> = {
  analyst: ['SQL', 'Calidad de datos'],
  engineering: ['SQL', 'Python / ETL', 'Code review'],
  science: ['Análisis exploratorio (EDA)', 'Modelos ML'],
  accounting: ['Facturación CFDI', 'Cobranza', 'Fiscal / IVA'],
};

const DEMO_GAPS: Record<string, string[]> = {
  analyst: ['Orquestación', 'Modelos ML'],
  engineering: ['Modelos ML'],
  science: ['Orquestación'],
  accounting: ['Nómina avanzada'],
};

export function buildDemoSkillProfile(role: 'analyst' | 'engineering' | 'science' | 'accounting'): SkillProfile {
  const raw = DEMO_SKILLS[role] || DEMO_SKILLS.analyst;
  const skills: SkillScore[] = raw.map(s => ({ id: s.label.toLowerCase().replace(/[^a-z0-9]/g, ''), label: s.label, score: s.score, level: levelFor(s.score) }))
    .sort((a, b) => b.score - a.score);
  const overall = Math.round(skills.reduce((s, k) => s + k.score, 0) / Math.max(skills.length, 1));
  return {
    specialty: role === 'accounting' ? 'accounting' : 'data_engineering',
    branch: role,
    skills,
    overall,
    strengths: DEMO_STRENGTHS[role] || [],
    gaps: DEMO_GAPS[role] || [],
  };
}
