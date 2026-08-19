// ─── Crónica del alumno (R-09 T6) ─────────────────────────────
// Log de hitos del mundo vivo: cada escena completada registra un hito
// fechado { sceneId, fechaSim, resultado, npc }. Es la fuente de logros
// de R-08 (CV/STAR usan sceneId + hechos). Se persiste en Supabase
// (tabla sim_story) con fallback a memoria (mismo patrón sim_world).

import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';

export interface ChronicleEntry {
  sceneId: string;
  fechaSim: string;       // '05-jul'
  resultado: string;      // 'completada' | 'fallida' | 'arco_cerrado'
  npc: string;            // id del NPC
  detail: string;         // lore breve
  at: string;             // ISO real (para ordenar)
}

// In-memory store por usuario (fallback / dev)
const chronicleStore = new Map<string, ChronicleEntry[]>();

function ensureStore(userId: string): ChronicleEntry[] {
  if (!chronicleStore.has(userId)) chronicleStore.set(userId, []);
  return chronicleStore.get(userId)!;
}

export async function getChronicle(userId: string): Promise<ChronicleEntry[]> {
  if (isSupabaseReady()) {
    try {
      const { data } = await supabaseAdmin
        .from('sim_story')
        .select('payload')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(200);
      if (data && data.length > 0) {
        const entries: ChronicleEntry[] = data
          .map((r: any) => r.payload?.chronicle)
          .filter(Boolean)
          .flat();
        if (entries.length > 0) {
          chronicleStore.set(userId, entries);
          return entries;
        }
      }
    } catch {
      // fallback a memoria
    }
  }
  return ensureStore(userId);
}

export async function appendChronicle(userId: string, entry: ChronicleEntry): Promise<ChronicleEntry[]> {
  const store = ensureStore(userId);
  store.push(entry);
  if (store.length > 200) store.splice(0, store.length - 200);
  return store;
}

export async function resetChronicle(userId: string): Promise<void> {
  chronicleStore.delete(userId);
}
