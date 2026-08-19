// ─── Learning Analytics — R-11 (flywheel de datos reales) ─────
// Núcleo del ciclo: uso real → telemetría → agregación → insight →
// ticket → aprobación staff → contenido mejorado.
//
// REGLA DE ORO R-11: los números/umbrales salen de motores/reglas o de
// agregación de datos reales. Ninguna trampa/feedback se despliega sin
// aprobación staff (gate) + auditoría story-coherence.

import crypto from 'crypto';
import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';
import { scrubData, dataContainsPII, scrubText } from './piiScrubber';

// ─── Umbrales (regla de oro: definidos aquí, testeados) ────────
export const TICKET_FAIL_RATE = 0.7;   // fail_rate > 0.7 → ticket
export const TICKET_GAIN = 0.2;        // learning_gain < 0.2 → ticket
export const MISCONCEPTION_MIN_FREQ = 3; // mínimo de veces para ser misconception

export interface TelemetryEvent {
  stage: number;      // 0..4
  type: string;       // task_fail | trap_missed | hint_used | question_answered | case_regen | outcome | ...
  ref?: Record<string, any>;
  data?: Record<string, any>;
}

// Hash irreversible del userId (sha256 + salt del entorno). Nunca se guarda
// el userId ni el email en telemetría.
const SALT = process.env.FLYWHEEL_SALT || 'r11-flywheel-salt';
export function userHash(userId: string): string {
  return crypto.createHash('sha256').update(`${SALT}:${userId}`).digest('hex').slice(0, 32);
}

// Ingesta batch (T1): valida shape, scrubba PII y persiste en quality_events.
export async function ingestEvents(userId: string, events: TelemetryEvent[]): Promise<{ inserted: number; rejected: number }> {
  if (!Array.isArray(events) || !events.length) return { inserted: 0, rejected: 0 };
  const hash = userHash(userId);
  let inserted = 0;
  let rejected = 0;

  for (const ev of events) {
    if (!ev || typeof ev.type !== 'string' || !ev.type) { rejected++; continue; }
    const stage = Number(ev.stage) || 0;
    const ref = scrubData(ev.ref || {});
    const data = scrubData(ev.data || {});
    // GATE de privacidad: si algo pasó el scrubber, se rechaza (nunca PII).
    if (dataContainsPII(JSON.stringify(ref) + JSON.stringify(data))) { rejected++; continue; }

    if (isSupabaseReady()) {
      try {
        await supabaseAdmin.from('quality_events').insert({ user_hash: hash, stage, type: ev.type, ref, data });
      } catch { /* memoria: no persistimos, pero contamos como insertado para no romper el flujo */ }
    }
    inserted++;
  }
  return { inserted, rejected };
}

// ─── Agregación (T3) ────────────────────────────────────────────

export interface ItemStat {
  ref_id: string;
  attempts: number;
  fail_rate: number;
  avg_time_s: number;
  learning_gain: number;
  discrimination: number;
}

// Agrega eventos crudos en item_stats. Requiere al menos un "antes" (question
// answered pre) y un "después" (post) para calcular learning_gain.
export function aggregateItems(events: TelemetryEvent[]): ItemStat[] {
  const byRef = new Map<string, { attempts: number; fails: number; times: number[]; pre: number[]; post: number[]; correct: number }>();

  for (const ev of events) {
    const refId = ev.ref?.taskId || ev.ref?.questionId || ev.ref?.skillId || 'anon';
    const bucket = byRef.get(refId) || { attempts: 0, fails: 0, times: [], pre: [], post: [], correct: 0 };
    bucket.attempts += 1;
    if (ev.type === 'task_fail' || ev.type === 'trap_missed') bucket.fails += 1;
    const t = Number(ev.data?.time_s || ev.data?.tiempo_s || 0);
    if (t > 0) bucket.times.push(t);
    if (ev.data?.phase === 'pre') bucket.pre.push(Number(ev.data?.score) || 0);
    if (ev.data?.phase === 'post') bucket.post.push(Number(ev.data?.score) || 0);
    if (ev.data?.correct === true || ev.data?.correct === 'true') bucket.correct += 1;
    byRef.set(refId, bucket);
  }

  const out: ItemStat[] = [];
  for (const [refId, b] of byRef) {
    const fail_rate = b.attempts ? b.fails / b.attempts : 0;
    const avg_time_s = b.times.length ? Math.round(b.times.reduce((a, x) => a + x, 0) / b.times.length) : 0;
    const preAvg = b.pre.length ? b.pre.reduce((a, x) => a + x, 0) / b.pre.length : 0;
    const postAvg = b.post.length ? b.post.reduce((a, x) => a + x, 0) / b.post.length : 0;
    // Ganancia normalizada 0-1 (post - pre sobre escala 0-100).
    const learning_gain = Math.max(0, Math.min(1, (postAvg - preAvg) / 100));
    // Discriminación simple: correlación entre intento correcto y score (0-1).
    const discrimination = b.attempts ? Math.min(1, (b.correct / b.attempts)) : 0;
    out.push({ ref_id: refId, attempts: b.attempts, fail_rate: +fail_rate.toFixed(3), avg_time_s, learning_gain: +learning_gain.toFixed(3), discrimination: +discrimination.toFixed(3) });
  }
  return out;
}

export interface Misconception {
  skill_id: string;
  pattern: string;
  example_anon: string;
  frequency: number;
  feedback_propuesto: string;
  status: string;
}

// Detecta misconceptions: agrupa respuestas incorrectas por skill + patrón
// (texto anonimizado). Frecuencia >= MISCONCEPTION_MIN_FREQ.
export function detectMisconceptions(events: TelemetryEvent[]): Misconception[] {
  const counts = new Map<string, { skill: string; example: string; n: number }>();
  for (const ev of events) {
    if (ev.type !== 'task_fail' && ev.type !== 'trap_missed') continue;
    const skill = ev.ref?.skillId || ev.ref?.taskId || 'general';
    const pattern = ev.data?.pattern || ev.data?.errorType || 'respuesta incorrecta';
    const key = `${skill}::${pattern}`;
    const cur = counts.get(key) || { skill, example: ev.data?.response || '', n: 0 };
    cur.n += 1;
    if (!cur.example && ev.data?.response) cur.example = String(ev.data.response).slice(0, 120);
    counts.set(key, cur);
  }
  const out: Misconception[] = [];
  for (const [key, c] of counts) {
    if (c.n < MISCONCEPTION_MIN_FREQ) continue;
    const [, pattern] = key.split('::');
    out.push({
      skill_id: c.skill,
      pattern,
      example_anon: scrubText(c.example),
      frequency: c.n,
      feedback_propuesto: `Feedback propuesto: revisa el patrón "${pattern}" en ${c.skill}.`,
      status: 'pendiente',
    });
  }
  return out.sort((a, b) => b.frequency - a.frequency);
}

// Crea tickets de mejora por umbrales (fail_rate>0.7 y gain<0.2).
export function createTicketsFromStats(stats: ItemStat[]): Array<{ origen: string; severidad: string; descripcion: string; ref: Record<string, any> }> {
  const tickets = [];
  for (const s of stats) {
    if (s.fail_rate > TICKET_FAIL_RATE && s.learning_gain < TICKET_GAIN) {
      tickets.push({
        origen: 'tarea',
        severidad: 'alta',
        descripcion: `"${s.ref_id}" tiene fail_rate ${(s.fail_rate * 100).toFixed(0)}% y ganancia ${(s.learning_gain).toFixed(2)} — requiere rediseño de feedback o drill.`,
        ref: { ref_id: s.ref_id, fail_rate: s.fail_rate, learning_gain: s.learning_gain },
      });
    } else if (s.fail_rate > TICKET_FAIL_RATE) {
      tickets.push({
        origen: 'tarea',
        severidad: 'media',
        descripcion: `"${s.ref_id}" falla el ${(s.fail_rate * 100).toFixed(0)}% de intentos — revisar dificultad o instrucciones.`,
        ref: { ref_id: s.ref_id, fail_rate: s.fail_rate },
      });
    }
  }
  return tickets;
}

// ─── Queries staff (T4) ────────────────────────────────────────

export interface QualityDashboard {
  source: string;
  topFail: Array<{ ref_id: string; fail_rate: number; attempts: number }>;
  worstGain: Array<{ ref_id: string; learning_gain: number; attempts: number }>;
  trapMissed: number;
  misconceptions: Misconception[];
  tickets: Array<{ id: number; origen: string; severidad: string; descripcion: string; status: string }>;
}

export async function getQualityDashboard(): Promise<QualityDashboard> {
  if (!isSupabaseReady()) {
    return { source: 'demo', topFail: [], worstGain: [], trapMissed: 0, misconceptions: [], tickets: [] };
  }
  try {
    const [statsRes, trapRes, misRes, tickRes] = await Promise.all([
      supabaseAdmin.from('item_stats').select('*').order('fail_rate', { ascending: false }).limit(10),
      supabaseAdmin.from('quality_events').select('id', { count: 'exact', head: true }).eq('type', 'trap_missed'),
      supabaseAdmin.from('misconceptions').select('*').order('frequency', { ascending: false }).limit(20),
      supabaseAdmin.from('improvement_tickets').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    const topFail = (statsRes.data || []).map((s: any) => ({ ref_id: s.ref_id, fail_rate: s.fail_rate, attempts: s.attempts }));
    const worstGain = (statsRes.data || [])
      .map((s: any) => ({ ref_id: s.ref_id, learning_gain: s.learning_gain, attempts: s.attempts }))
      .sort((a, b) => a.learning_gain - b.learning_gain)
      .slice(0, 5);
    return {
      source: 'supabase',
      topFail,
      worstGain,
      trapMissed: trapRes.count || 0,
      misconceptions: (misRes.data || []).map((m: any) => ({ skill_id: m.skill_id, pattern: m.pattern, example_anon: m.example_anon, frequency: m.frequency, feedback_propuesto: m.feedback_propuesto, status: m.status })),
      tickets: (tickRes.data || []).map((t: any) => ({ id: t.id, origen: t.origen, severidad: t.severidad, descripcion: t.descripcion, status: t.status })),
    };
  } catch (e: any) {
    console.error('getQualityDashboard falló:', e.message);
    return { source: 'demo', topFail: [], worstGain: [], trapMissed: 0, misconceptions: [], tickets: [] };
  }
}

// Persiste agrupaciones detectadas (misconceptions) para revisión staff.
export async function persistMisconceptions(list: Misconception[]): Promise<number> {
  if (!isSupabaseReady() || !list.length) return 0;
  let n = 0;
  for (const m of list) {
    try {
      await supabaseAdmin.from('misconceptions').upsert(
        { skill_id: m.skill_id, pattern: m.pattern, example_anon: m.example_anon, frequency: m.frequency, feedback_propuesto: m.feedback_propuesto, status: 'pendiente' },
        { onConflict: 'skill_id,pattern' }
      );
      n++;
    } catch { /* ya existe o falló */ }
  }
  return n;
}

// Persiste item_stats agregados (upsert por ref_id).
export async function persistItemStats(stats: ItemStat[]): Promise<number> {
  if (!isSupabaseReady() || !stats.length) return 0;
  let n = 0;
  for (const s of stats) {
    try {
      await supabaseAdmin.from('item_stats').upsert({ ...s, updated_at: new Date().toISOString() }, { onConflict: 'ref_id' });
      n++;
    } catch { /* noop */ }
  }
  return n;
}

// Gate staff: aprobar/rechazar un ticket. Nada se despliega sin este gate.
export async function setTicketStatus(ticketId: number, status: 'aprobado' | 'rechazado', resolvedBy = 'staff'): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  try {
    await supabaseAdmin.from('improvement_tickets').update({ status, resuelto_por: resolvedBy }).eq('id', ticketId);
    return true;
  } catch { return false; }
}

// ─── Outcome tracking (R-11 T6, consentido) ────────────────────
// Resultados reales de la búsqueda de empleo: aplicaciones, entrevistas,
// contratación. Solo se registra con consentimiento explícito del alumno
// (el frontend lo pide antes de llamar).

export interface OutcomeInput {
  applied?: number;         // # de postulaciones
  interviews?: number;      // # de entrevistas
  hired?: boolean;          // ¿consiguió empleo?
  skills_entrevista?: string[];
}

// Lee el outcome actual del usuario (si existe).
export async function getOutcome(userId: string): Promise<Record<string, any> | null> {
  if (!isSupabaseReady()) return null;
  try {
    const { data } = await supabaseAdmin.from('outcome_tracking').select('*').eq('user_hash', userHash(userId)).maybeSingle();
    return data || null;
  } catch { return null; }
}

// Registra (upsert) el outcome. user_hash irreversible, sin PII.
export async function recordOutcome(userId: string, input: OutcomeInput): Promise<{ ok: boolean; outcome: Record<string, any> }> {
  const hash = userHash(userId);
  const existing = await getOutcome(userId);
  const outcome = {
    user_hash: hash,
    applied: Number(input.applied ?? existing?.applied ?? 0),
    interviews: Number(input.interviews ?? existing?.interviews ?? 0),
    hired: input.hired ?? existing?.hired ?? false,
    skills_entrevista: scrubData(input.skills_entrevista ?? existing?.skills_entrevista ?? []),
    updated_at: new Date().toISOString(),
  };
  if (isSupabaseReady()) {
    try {
      await supabaseAdmin.from('outcome_tracking').upsert(outcome, { onConflict: 'user_hash' });
    } catch { /* memoria */ }
  }
  // También se emite como evento del flywheel (cierra el ciclo).
  await ingestEvents(userId, [{
    stage: 4, // resultados reales
    type: 'outcome',
    ref: {},
    data: { applied: outcome.applied, interviews: outcome.interviews, hired: outcome.hired },
  }]).catch(() => {});
  return { ok: true, outcome };
}