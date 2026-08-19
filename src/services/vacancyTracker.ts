// ─── Vacancy Tracker — Etapa 2 (R-10 v2) ──────────────────────
// Seguimiento de vacantes del alumno con límite del plan free (2
// simultáneas). Persiste en Supabase (vacancy_tracking) con fallback
// a memoria. El campo `plan` del perfil (free|pro) rige el límite.

import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';

export const FREE_LIMIT = 2;

export type VacancyStatus = 'diagnostico' | 'preparacion' | 'postulacion' | 'entrevista' | 'cerrada';

export interface VacancyRow {
  id: string;
  user_id: string;
  vacancy_id: string;
  stage1_result_id?: string;
  modo: 'A' | 'B';
  status: VacancyStatus;
  vacante_titulo?: string;
  vacante_stack?: string;
  match_pct?: number;
  created_at: string;
  updated_at: string;
}

const memStore = new Map<string, VacancyRow[]>();

async function saveRemote(r: VacancyRow): Promise<void> {
  if (!isSupabaseReady()) return;
  try {
    await supabaseAdmin.from('vacancy_tracking').upsert({ ...r }, { onConflict: 'user_id,vacancy_id' });
  } catch {
    // memoria
  }
}

async function getRemote(userId: string): Promise<VacancyRow[]> {
  if (!isSupabaseReady()) return [];
  try {
    const { data } = await supabaseAdmin.from('vacancy_tracking').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return (data || []) as VacancyRow[];
  } catch {
    return memStore.get(userId) || [];
  }
}

async function getVacancies(userId: string): Promise<VacancyRow[]> {
  const remote = await getRemote(userId);
  if (remote.length || (await getRemoteCount(userId))) {
    memStore.set(userId, remote);
    return remote;
  }
  return memStore.get(userId) || [];
}

async function getRemoteCount(userId: string): Promise<number> {
  if (!isSupabaseReady()) return 0;
  try {
    const { count } = await supabaseAdmin.from('vacancy_tracking').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    return count || 0;
  } catch {
    return 0;
  }
}

async function getPlan(userId: string): Promise<'free' | 'pro'> {
  if (isSupabaseReady()) {
    try {
      const { data } = await supabaseAdmin.from('profiles').select('plan').eq('id', userId).maybeSingle();
      if (data?.plan) return data.plan as 'free' | 'pro';
    } catch { /* free */ }
  }
  return 'free';
}

export interface TrackInput {
  vacancy_id: string;
  stage1_result_id?: string;
  modo?: 'A' | 'B';
  vacante_titulo?: string;
  vacante_stack?: string;
  match_pct?: number;
}

export type TrackResult =
  | { ok: true; vacancy: VacancyRow; active: number; limit: number }
  | { ok: false; code: 402 | 409; message: string };

// POST /api/vacancies/track — registrar una vacante (valida límite free)
export async function trackVacancy(userId: string, input: TrackInput): Promise<TrackResult> {
  const plan = await getPlan(userId);
  const vacancies = await getVacancies(userId);

  // Duplicado siempre se rechaza, sin importar el límite
  const already = vacancies.find(v => v.vacancy_id === input.vacancy_id);
  if (already) {
    return { ok: false, code: 409, message: 'Esa vacante ya está en seguimiento.' };
  }

  const active = vacancies.filter(v => v.status !== 'cerrada').length;

  if (plan === 'free' && active >= FREE_LIMIT) {
    return {
      ok: false,
      code: 402,
      message: `Plan free: máximo ${FREE_LIMIT} vacantes simultáneas. Cierra una o actualiza a Pro.`,
    };
  }

  const row: VacancyRow = {
    id: `vt-${userId.slice(0, 6)}-${Date.now().toString(36)}`,
    user_id: userId,
    vacancy_id: input.vacancy_id,
    stage1_result_id: input.stage1_result_id,
    modo: input.modo || 'B',
    status: 'diagnostico',
    vacante_titulo: input.vacante_titulo?.slice(0, 120),
    vacante_stack: input.vacante_stack?.slice(0, 120),
    match_pct: input.match_pct,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  vacancies.unshift(row);
  memStore.set(userId, vacancies);
  await saveRemote(row);
  return { ok: true, vacancy: row, active: vacancies.filter(v => v.status !== 'cerrada').length, limit: FREE_LIMIT };
}

// POST /api/vacancies/:id/status — avanzar/cerrar una vacante
export async function setVacancyStatus(userId: string, vacancyId: string, status: VacancyStatus): Promise<VacancyRow | null> {
  const vacancies = await getVacancies(userId);
  const row = vacancies.find(v => v.vacancy_id === vacancyId);
  if (!row) return null;
  row.status = status;
  row.updated_at = new Date().toISOString();
  memStore.set(userId, vacancies);
  await saveRemote(row);
  return row;
}

// GET /api/vacancies — listar vacantes del usuario
export async function listVacancies(userId: string): Promise<{ vacancies: VacancyRow[]; active: number; limit: number; plan: string }> {
  const vacancies = await getVacancies(userId);
  const plan = await getPlan(userId);
  return { vacancies, active: vacancies.filter(v => v.status !== 'cerrada').length, limit: FREE_LIMIT, plan };
}

// Para tests: limpiar el store de memoria de un usuario (no toca Supabase).
export function resetVacancyMem(userId: string): void {
  memStore.delete(userId);
}