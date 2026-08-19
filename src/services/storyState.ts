// ─── Estado del mundo vivo por usuario (R-09 T6) ──────────────
// Integra: caso del día (caseGenerator), estado del arco activo
// (storyArcs) y NPCs (npcEngine). Se persiste en Supabase (tabla
// sim_story, patrón sim_world) con fallback a memoria.

import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';
import { buildCase, GeneratedCase } from './caseGenerator';
import { STORY_ARCS, type RouteId } from '../data/storyArcs';
import { freshNpcWorld, applyNpcEvent, NpcWorld, NpcReaction, NpcEventType } from './npcEngine';
import { appendChronicle } from './chronicle';
import { ingestEvents } from './learningAnalytics';

export interface StoryState {
  route: RouteId;
  arcId: string;
  activeScene: string | null;
  cases: GeneratedCase[];        // histórico de casos generados
  npcs: NpcWorld;
  chronicle: any[];              // espejo local (autoridad en chronicle.ts)
  events: NpcReaction[];         // correos/toasts pendientes de mostrar
  updatedAt: string;
}

function freshStory(route: RouteId, arcId: string): StoryState {
  const arcs = STORY_ARCS.filter(a => a.route === route);
  const arc = arcId ? arcs.find(a => a.id === arcId) || arcs[0] : arcs[0];
  const npcIds = arc ? arc.escenas.map(s => s.npc) : [];
  return {
    route,
    arcId: arc?.id || route,
    activeScene: null,
    cases: [],
    npcs: freshNpcWorld([...new Set(npcIds)]),
    chronicle: [],
    events: [],
    updatedAt: new Date().toISOString(),
  };
}

const storyStore = new Map<string, StoryState>();

async function saveRemote(userId: string, s: StoryState): Promise<void> {
  if (!isSupabaseReady()) return;
  try {
    await supabaseAdmin.from('sim_story').upsert(
      { user_id: userId, arc_id: s.arcId, scene_id: s.activeScene, status: s.activeScene ? 'in_progress' : 'ready', payload: s as any, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  } catch {
    // degrado a memoria
  }
}

export async function getStoryState(userId: string, route?: RouteId, arcId?: string): Promise<StoryState> {
  if (isSupabaseReady()) {
    try {
      const { data } = await supabaseAdmin.from('sim_story').select('payload').eq('user_id', userId).maybeSingle();
      if (data?.payload) {
        const s = data.payload as StoryState;
        if (!s.npcs) s.npcs = {};
        if (!s.cases) s.cases = [];
        storyStore.set(userId, s);
        return s;
      }
    } catch {
      // fallback
    }
  }
  const existing = storyStore.get(userId);
  if (existing) return existing;
  const s = freshStory(route || 'contable', arcId || '');
  storyStore.set(userId, s);
  await saveRemote(userId, s);
  return s;
}

// Obtiene (o genera) el caso del día para la ruta/arco activo.
export async function getActiveCase(userId: string, weekKey: string, route: RouteId, arcId?: string): Promise<GeneratedCase> {
  const state = await getStoryState(userId, route, arcId);
  const last = state.cases[state.cases.length - 1];
  if (last && last.weekKey === weekKey && last.arcId === arcId) return last;

  const c = buildCase({ userId, weekKey, route, arcId });
  state.cases.push(c);
  state.activeScene = c.sceneId;
  state.arcId = arcId || c.arcId;
  state.updatedAt = new Date().toISOString();
  storyStore.set(userId, state);
  await saveRemote(userId, state);
  return c;
}

// Registra el resultado de una escena → dispara npcEngine → crónica.
export async function completeScene(
  userId: string,
  input: { sceneId: string; taskType: string; resultado: 'completada' | 'fallida'; trapId?: string; npcEvent?: NpcEventType }
): Promise<{ state: StoryState; reaction: NpcReaction | null }> {
  const state = await getStoryState(userId);
  const scene = STORY_ARCS.flatMap(a => a.escenas).find(s => s.sceneId === input.sceneId);
  const npcId = scene?.npc || 'sandra_mora';
  const npc = state.npcs[npcId] || (state.npcs[npcId] = { npcId, trust: 50, nivelEscalera: 0, erroresRepetidos: {}, actions: [] });

  // Determina el evento NPC según el resultado
  const eventType: NpcEventType = input.resultado === 'completada'
    ? (input.npcEvent || 'arc_completed')
    : (input.npcEvent || (input.trapId ? 'task_failed' : 'task_failed'));

  const reaction = applyNpcEvent(npc, {
    type: eventType,
    trapId: input.trapId,
    sceneId: input.sceneId,
    taskType: input.taskType,
  });
  state.npcs[npcId] = reaction.state;
  state.events.push(reaction);
  if (state.events.length > 30) state.events = state.events.slice(-30);

  // R-11: telemetría del resultado de escena (flywheel).
  await ingestEvents(userId, [{
    stage: 2, // simulador
    type: input.resultado === 'completada' ? 'case_pass' : (input.trapId ? 'trap_missed' : 'task_fail'),
    ref: { caseSeed: state.cases[state.cases.length - 1]?.seed, sceneId: input.sceneId, taskType: input.taskType, trapId: input.trapId },
    data: { npc: npcId, eventType },
  }]).catch(() => {});

  // Crónica
  await appendChronicle(userId, {
    sceneId: input.sceneId,
    fechaSim: scene?.ventanaSim || '08-jul',
    resultado: input.resultado,
    npc: npcId,
    detail: scene?.consecuencia || input.taskType,
    at: new Date().toISOString(),
  });

  state.updatedAt = new Date().toISOString();
  storyStore.set(userId, state);
  await saveRemote(userId, state);
  return { state, reaction };
}

export async function resetStory(userId: string, route: RouteId): Promise<StoryState> {
  const s = freshStory(route, '');
  storyStore.set(userId, s);
  await saveRemote(userId, s);
  return s;
}
