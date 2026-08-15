// ─── Mundo simulado por usuario (persistente) ─────────────────
// Estado global del simulador DE: el incidente del 05-jul, los SLAs, el
// registro de acciones y el árbol de rutas de la especialidad data.
// Se persiste en Supabase (tabla sim_world) cuando el backend está
// configurado con credenciales reales; en desarrollo (mocks) o ante fallo
// de conexión degrada a memoria sin romper la simulación.

import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';
import { freshCareerPath, CareerPathState } from './careerPath';

export interface WorldAction {
  at: string;
  type: string;
  detail: string;
}

export interface WorldState {
  pipeline: {
    dagId: string;
    lastRunDate: string;
    status: 'failed' | 'recovered';
    failedTask: string;
    failedTest: string;
    recoveredAt?: string;
  };
  slas: {
    mrtSla: 'breached' | 'met';
    lastBreach: string;
  };
  actions: WorldAction[];
  careerPath: CareerPathState;
}

const worldStore = new Map<string, WorldState>();

function freshWorld(): WorldState {
  return {
    pipeline: {
      dagId: 'lno_sales_pipeline',
      lastRunDate: '05-jul',
      status: 'failed',
      failedTask: 'dbt_test',
      failedTest: 'positive(total_ventas)',
    },
    slas: {
      mrtSla: 'breached',
      lastBreach: '05-jul',
    },
    actions: [
      { at: new Date().toISOString(), type: 'seed', detail: 'Run del 05-jul falló en dbt_test (positive(total_ventas))' },
    ],
    careerPath: freshCareerPath(),
  };
}

async function saveRemote(userId: string, w: WorldState): Promise<void> {
  if (!isSupabaseReady()) return;
  try {
    await supabaseAdmin.from('sim_world').upsert(
      { user_id: userId, state: w as any, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  } catch {
    // La BD remota puede estar pausada o la tabla sin aplicar: seguimos en memoria.
  }
}

export async function getWorld(userId: string): Promise<WorldState> {
  if (isSupabaseReady()) {
    try {
      const { data } = await supabaseAdmin.from('sim_world').select('state').eq('user_id', userId).maybeSingle();
      if (data?.state) {
        const w = data.state as WorldState;
        if (!w.careerPath) w.careerPath = freshCareerPath();
        worldStore.set(userId, w);
        return w;
      }
    } catch {
      // fallback a memoria
    }
  }
  const existing = worldStore.get(userId);
  if (existing) {
    if (!existing.careerPath) existing.careerPath = freshCareerPath();
    return existing;
  }
  const w = freshWorld();
  worldStore.set(userId, w);
  await saveRemote(userId, w);
  return w;
}

export async function addAction(userId: string, type: string, detail: string): Promise<WorldState> {
  const world = await getWorld(userId);
  world.actions.push({ at: new Date().toISOString(), type, detail });
  if (world.actions.length > 50) world.actions = world.actions.slice(-50);
  await saveRemote(userId, world);
  return world;
}

export async function recoverIncident(userId: string): Promise<WorldState> {
  const world = await getWorld(userId);
  world.pipeline.status = 'recovered';
  world.pipeline.recoveredAt = new Date().toISOString();
  world.slas.mrtSla = 'met';
  await addAction(userId, 'incident_recovery', 'Incidente del 05-jul resuelto: modelo corregido y run reprocesado');
  return world;
}

export async function resetWorld(userId: string): Promise<WorldState> {
  const w = freshWorld();
  worldStore.set(userId, w);
  await saveRemote(userId, w);
  return w;
}

// ─── Árbol de rutas (R-07) ────────────────────────────────────

export async function getCareerPath(userId: string): Promise<CareerPathState> {
  const world = await getWorld(userId);
  if (!world.careerPath) {
    world.careerPath = freshCareerPath();
    await saveRemote(userId, world);
  }
  return world.careerPath;
}

export async function saveCareerPath(userId: string, careerPath: CareerPathState): Promise<CareerPathState> {
  const world = await getWorld(userId);
  world.careerPath = careerPath;
  await saveRemote(userId, world);
  return careerPath;
}

export async function resetCareer(userId: string): Promise<CareerPathState> {
  const cp = freshCareerPath();
  await saveCareerPath(userId, cp);
  return cp;
}
