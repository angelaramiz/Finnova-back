// ─── Catálogo de casos de Pólizas: Supabase con fallback a memoria ───
// Fuente única de verdad: data/polizaDataset.ts. Si Supabase está listo se
// lee de la tabla poliza_casos (auto-sembrada si está vacía); si no, memoria.
import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';
import { POLIZA_CASOS, getPolizaSemilla, type PolizaCaso } from '../data/polizaDataset';

function filaACaso(f: { uuid_cfdi: string; nombre: string; categoria: PolizaCaso['categoria']; cfdi: PolizaCaso['cfdi']; edo: PolizaCaso['edo'] }): PolizaCaso {
  return { id: f.uuid_cfdi, nombre: f.nombre, categoria: f.categoria, cfdi: f.cfdi, edo: f.edo };
}

async function sembrarSiVacia(): Promise<void> {
  try {
    const { count } = await supabaseAdmin.from('poliza_casos').select('uuid_cfdi', { count: 'exact', head: true });
    if ((count ?? 0) > 0) return;
    await supabaseAdmin.from('poliza_casos').insert(
      POLIZA_CASOS.map((c) => ({ uuid_cfdi: c.id, nombre: c.nombre, categoria: c.categoria, cfdi: c.cfdi, edo: c.edo })),
    );
  } catch {
    // best-effort: la lectura cae a memoria de todos modos
  }
}

export async function getPolizaCasosServicio(): Promise<PolizaCaso[]> {
  if (!isSupabaseReady()) return POLIZA_CASOS;
  try {
    await sembrarSiVacia();
    const { data, error } = await supabaseAdmin.from('poliza_casos').select('*').order('nombre');
    if (error || !data || data.length === 0) return POLIZA_CASOS;
    // Orden del dataset (R-01 primero): reordena por índice canónico.
    const orden = new Map(POLIZA_CASOS.map((c, i) => [c.id, i]));
    return data.map(filaACaso).sort((a, b) => (orden.get(a.id) ?? 99) - (orden.get(b.id) ?? 99));
  } catch {
    return POLIZA_CASOS;
  }
}

/** Semilla sin repetir: primer caso cuyo UUID no esté en `usados`. */
export async function getPolizaSemillaServicio(usados: string[] = []): Promise<PolizaCaso | null> {
  const casos = await getPolizaCasosServicio();
  const set = new Set((usados || []).map((u) => String(u).trim().toUpperCase()));
  return casos.find((c) => !set.has(c.id.toUpperCase())) ?? null;
}

export { getPolizaSemilla };
