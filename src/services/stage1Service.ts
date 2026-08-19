// ─── Etapa 1 — Diagnóstico de vacante (R-10 v2) ───────────────
// Integra: analyzeVacancy (IA o determinístico) → prueba de skills →
// computeMatch contra el perfil real del alumno → routeStage.
// Persiste el assessment en Supabase (stage1_assessments) con fallback
// a memoria (mismo patrón sim_story).

import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';
import { analyzeVacancy } from './vacancyAnalyzer';
import { computeMatch, UMBRAL_MODO_A } from './matchScorer';
import { routeStage, UMBRAL_DENSIDAD } from './stageRouter';
import { buildSkillProfile } from './skillProfile';
import { trackVacancy, updateVacancyMode } from './vacancyTracker';
import { ingestEvents } from './learningAnalytics';

export interface Stage1Result {
  assessment_id: string;
  vacancy: any;
  match_pct: number;
  breakdown: any;
  top_gaps: string[];
  covered: string[];
  routing: 'ETAPA_2_MODO_A' | 'ETAPA_2_MODO_B' | 'ETAPA_3';
  needs_experience: boolean;
  source: string;
  tracked?: boolean;   // true si el diagnóstico registró la vacante en seguimiento
}

interface AssessmentRow {
  id: string;
  user_id: string;
  vacancy_text: string;
  vacancy_title: string;
  vacancy_skills: any;
  requires_experience: boolean;
  match_pct: number;
  match_breakdown: any;
  routing: string;
  answers: any;
  created_at: string;
}

const memAssessments = new Map<string, AssessmentRow[]>();

async function saveRemote(a: AssessmentRow): Promise<void> {
  if (!isSupabaseReady()) return;
  try {
    await supabaseAdmin.from('stage1_assessments').upsert({ ...a }, { onConflict: 'id' });
  } catch {
    // memoria
  }
}

async function getRemoteAssessments(userId: string): Promise<AssessmentRow[]> {
  if (!isSupabaseReady()) return [];
  try {
    const { data } = await supabaseAdmin.from('stage1_assessments').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
    return (data || []) as AssessmentRow[];
  } catch {
    return memAssessments.get(userId) || [];
  }
}

async function getAssessments(userId: string): Promise<AssessmentRow[]> {
  const remote = await getRemoteAssessments(userId);
  if (remote.length) {
    memAssessments.set(userId, remote);
    return remote;
  }
  return memAssessments.get(userId) || [];
}

// POST /api/stage1/analyze — pegar vacante → skills + prueba
export async function analyzeVacancyForUser(userId: string, vacancyText: string, specialty = 'data_engineering'): Promise<Stage1Result> {
  const vacancy = await analyzeVacancy(vacancyText);
  const profile = await buildSkillProfile(userId, specialty);
  const match = computeMatch(profile.skills, vacancy.skills);

  // densidad de experiencia del alumno (de profiles o 0 si sin datos)
  let density = 0;
  if (isSupabaseReady()) {
    try {
      const { data } = await supabaseAdmin.from('profiles').select('experience_density').eq('id', userId).maybeSingle();
      density = Number(data?.experience_density) || 0;
    } catch { /* 0 */ }
  }
  const densityNorm = Math.min(1, density / 100);

  const routing = routeStage({ match_pct: match.match_pct, requires_experience: vacancy.requires_experience, experience_density: densityNorm });

  const row: AssessmentRow = {
    id: `stage1-${userId.slice(0, 8)}-${Date.now().toString(36)}`,
    user_id: userId,
    vacancy_text: vacancyText.slice(0, 4000),
    vacancy_title: (vacancy.title || 'Vacante').slice(0, 120),
    vacancy_skills: vacancy.skills,
    requires_experience: vacancy.requires_experience,
    match_pct: match.match_pct,
    match_breakdown: match.breakdown,
    routing,
    answers: null,
    created_at: new Date().toISOString(),
  };
  const list = await getAssessments(userId);
  list.unshift(row);
  memAssessments.set(userId, list);
  await saveRemote(row);

  // R-11: telemetría de la vacante analizada (taxonomía de skills demandados).
  await ingestEvents(userId, [{
    stage: 1, // diagnóstico
    type: 'vacancy_analyzed',
    ref: { vacancyId: row.id, skills: (vacancy.skills || []).map(s => s.skill) },
    data: { match_pct: match.match_pct, top_gaps: match.top_gaps || [], routing },
  }]).catch(() => {});

  return {
    assessment_id: row.id,
    vacancy,
    match_pct: match.match_pct,
    breakdown: match.breakdown,
    top_gaps: match.top_gaps,
    covered: match.covered,
    routing,
    needs_experience: vacancy.requires_experience,
    source: vacancy.source,
  };
}

// POST /api/stage1/submit — respuestas de la prueba → match final + routing
export async function submitStage1(userId: string, assessmentId: string, answers: Record<string, any>, specialty = 'data_engineering'): Promise<Stage1Result> {
  const list = await getAssessments(userId);
  const row = list.find(a => a.id === assessmentId);
  if (!row) throw new Error('Assessment no encontrado');

  // Respuestas de la prueba: suman puntos al match (evaluación simple 0-100)
  const answerScore = evaluateAnswers(answers);
  const baseMatch = Number(row.match_pct) || 0;
  const match_pct = Math.round(baseMatch * 0.6 + answerScore * 0.4);

  const profile = await buildSkillProfile(userId, specialty);
  const match = computeMatch(profile.skills, (row.vacancy_skills || []) as any);
  // Recalcular gaps con el nuevo match
  const density = await getDensity(userId);
  const routing = routeStage({ match_pct, requires_experience: !!row.requires_experience, experience_density: density });

  row.match_pct = match_pct;
  row.answers = answers;
  row.routing = routing;
  await saveRemote(row);

  // R-11: telemetría de preguntas fallidas del diagnóstico (flywheel).
  const wrongAnswers = Object.entries(answers || {}).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== true && v !== 'true' && String(v).trim() !== '1');
  await ingestEvents(userId, wrongAnswers.map(([q]) => ({
    stage: 1, // diagnóstico
    type: 'question_answered',
    ref: { questionId: q, vacancyId: row.id },
    data: { correct: false, phase: 'pre' },
  }))).catch(() => {});

  // CONEXIÓN Etapa 1 → Etapa 2: al completar el diagnóstico, se registra
  // la vacante en seguimiento con modo A/B según el routing final.
  const tracked = await ensureTracked(userId, row);

  return {
    assessment_id: row.id,
    vacancy: { skills: row.vacancy_skills, requires_experience: row.requires_experience, title: row.vacancy_title },
    match_pct,
    breakdown: match.breakdown,
    top_gaps: match.top_gaps,
    covered: match.covered,
    routing,
    needs_experience: !!row.requires_experience,
    source: 'submit',
    tracked,
  };
}

// Registra (o actualiza) la vacante en vacancy_tracking según el routing.
async function ensureTracked(userId: string, row: AssessmentRow): Promise<boolean> {
  if (row.routing === 'ETAPA_3') return false; // Etapa 3 no entra a seguimiento de vacante
  const modo = row.routing === 'ETAPA_2_MODO_A' ? 'A' : 'B';
  const stack = (Array.isArray(row.vacancy_skills) ? row.vacancy_skills : [])
    .map((s: any) => s.skill).join(', ').slice(0, 120);
  const res = await trackVacancy(userId, {
    vacancy_id: `vac-${row.id}`,
    stage1_result_id: row.id,
    modo,
    vacante_titulo: row.vacancy_title || 'Vacante',
    vacante_stack: stack,
    match_pct: row.match_pct,
  });
  return res.ok === true;
}

// POST /api/stage1/reevaluate — misma vacante tras completar bloques
export async function reevaluateStage1(userId: string, assessmentId: string, specialty = 'data_engineering'): Promise<Stage1Result> {
  const list = await getAssessments(userId);
  const row = list.find(a => a.id === assessmentId);
  if (!row) throw new Error('Assessment no encontrado');

  const profile = await buildSkillProfile(userId, specialty);
  const match = computeMatch(profile.skills, (row.vacancy_skills || []) as any);
  const density = await getDensity(userId);
  const routing = routeStage({ match_pct: match.match_pct, requires_experience: !!row.requires_experience, experience_density: density });

  row.match_pct = match.match_pct;
  row.match_breakdown = match.breakdown;
  row.routing = routing;
  await saveRemote(row);

  // Reevaluación: si migra a Modo A, actualiza la vacante en seguimiento.
  if (routing === 'ETAPA_2_MODO_A' || routing === 'ETAPA_2_MODO_B') {
    await updateVacancyMode(userId, row.id, routing === 'ETAPA_2_MODO_A' ? 'A' : 'B', match.match_pct);
  }

  return {
    assessment_id: row.id,
    vacancy: { skills: row.vacancy_skills, requires_experience: row.requires_experience, title: row.vacancy_title },
    match_pct: match.match_pct,
    breakdown: match.breakdown,
    top_gaps: match.top_gaps,
    covered: match.covered,
    routing,
    needs_experience: !!row.requires_experience,
    source: 'reevaluate',
  };
}

// Evalúa respuestas de la prueba: proporción de respuestas correctas (0-100).
function evaluateAnswers(answers: Record<string, any>): number {
  const entries = Object.entries(answers || {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return 0;
  const correct = entries.filter(([, v]) => v === true || v === 'true' || String(v).trim() === '1').length;
  return Math.round((correct / entries.length) * 100);
}

async function getDensity(userId: string): Promise<number> {
  if (!isSupabaseReady()) return 0;
  try {
    const { data } = await supabaseAdmin.from('profiles').select('experience_density').eq('id', userId).maybeSingle();
    return Math.min(1, (Number(data?.experience_density) || 0) / 100);
  } catch {
    return 0;
  }
}

// Persiste la densidad de experiencia en profiles.experience_density.
// Regla de oro: el número sale de experienceDensity.computeDensity (motor).
export async function saveDensity(userId: string, density_pct: number): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  try {
    await supabaseAdmin.from('profiles').update({ experience_density: Math.round(density_pct) }).eq('id', userId);
    return true;
  } catch {
    return false;
  }
}

// GET assessments — para listar diagnósticos previos y reevaluar.
export async function listAssessments(userId: string): Promise<Array<{ assessment_id: string; title: string; match_pct: number; routing: string; created_at: string }>> {
  const list = await getAssessments(userId);
  return list.map(a => ({
    assessment_id: a.id,
    title: a.vacancy_title || 'Vacante',
    match_pct: a.match_pct,
    routing: a.routing,
    created_at: a.created_at,
  }));
}

export { UMBRAL_MODO_A, UMBRAL_DENSIDAD };
