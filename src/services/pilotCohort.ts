// ─── Puerta de piloto Contalink (TASK-2-1) ─────────────────────
// Cohorte staff-gestionada: solo estos user_id ven las practicas Contalink
// como practica real. Persiste en Supabase (tabla pilot_cohort) cuando el
// backend esta configurado; en tests/dev degrada a memoria.

import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';

export interface CohortRow {
  user_id: string;
  added_at: string;
  added_by: string;
}

const cohortMem = new Map<string, CohortRow>();

export async function listCohort(): Promise<CohortRow[]> {
  if (!isSupabaseReady()) return [...cohortMem.values()];
  try {
    const { data, error } = await supabaseAdmin
      .from('pilot_cohort')
      .select('user_id,added_at,added_by')
      .order('added_at', { ascending: false });
    if (error) throw error;
    return (data || []) as CohortRow[];
  } catch {
    return [...cohortMem.values()];
  }
}

export async function addToCohort(userId: string, addedBy: string): Promise<CohortRow> {
  const row: CohortRow = { user_id: userId, added_at: new Date().toISOString(), added_by: addedBy };
  cohortMem.set(userId, row);
  if (!isSupabaseReady()) return row;
  try {
    const { error } = await supabaseAdmin.from('pilot_cohort').upsert(row, { onConflict: 'user_id' });
    if (error) throw error;
  } catch {
    // Sin tabla (migracion no aplicada) o BD pausada: queda en memoria.
  }
  return row;
}

export async function removeFromCohort(userId: string): Promise<void> {
  cohortMem.delete(userId);
  if (!isSupabaseReady()) return;
  try {
    await supabaseAdmin.from('pilot_cohort').delete().eq('user_id', userId);
  } catch {
    // Idem: memoria manda.
  }
}

export async function isPilot(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  if (cohortMem.has(userId)) return true;
  if (!isSupabaseReady()) return false;
  try {
    const { data, error } = await supabaseAdmin
      .from('pilot_cohort')
      .select('user_id')
      .eq('user_id', userId)
      .limit(1);
    if (error) throw error;
    return (data || []).length > 0;
  } catch {
    return cohortMem.has(userId);
  }
}
