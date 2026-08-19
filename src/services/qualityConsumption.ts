// ─── Consumo del flywheel (R-11 T5) ───────────────────────────
// Convierte los insights agregados (misconceptions aprobadas por staff,
// item_stats) en mejoras concretas del contenido en vivo:
//   - Feedback enriquecido (deValidation / workflowEngine)
//   - Sugerencia de trampa basada en un error real
//   - Drill / pregunta de entrevista por el error que de verdad se comete
//   - coverage_gap por taxonomía de vacantes (matchScorer / careerPath)
//
// REGLA DE ORO R-11: solo se consume lo APROBADO por staff (gate). Los
// umbrales (fail_rate>0.7, gain<0.2, freq>=3) vienen de learningAnalytics.

import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';
import { TICKET_FAIL_RATE } from './learningAnalytics';
import { scrubText } from './piiScrubber';

export interface ApprovedMisconception {
  skill_id: string;
  pattern: string;
  example_anon: string;
  frequency: number;
  feedback_propuesto: string;
}

// Mapa en memoria (TTL por sesión) de misconceptions aprobadas por skill.
let approvedCache: ApprovedMisconception[] | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 60_000;

async function getApproved(skillId?: string): Promise<ApprovedMisconception[]> {
  if (!isSupabaseReady()) return [];
  const now = Date.now();
  if (!approvedCache || now - cacheAt > CACHE_TTL_MS) {
    approvedCache = [];
    try {
      const { data } = await supabaseAdmin
        .from('misconceptions')
        .select('skill_id,pattern,example_anon,frequency,feedback_propuesto')
        .eq('status', 'aprobado');
      approvedCache = (data || []) as ApprovedMisconception[];
    } catch { approvedCache = []; }
    cacheAt = now;
  }
  if (!skillId) return approvedCache!;
  return approvedCache!.filter(m => m.skill_id === skillId);
}

// Feedback enriquecido: si hay una misconception aprobada para el skill,
// añade el patrón real y su ejemplo anonimizado al feedback del validador.
export async function enrichFeedback(skillId: string, baseFeedback: string): Promise<string> {
  const list = await getApproved(skillId);
  if (!list.length) return baseFeedback;
  const top = list[0];
  const extra = ` [Mejora del flywheel] Este error es común (×${top.frequency}): ${top.pattern}.${top.example_anon ? ` Ejemplo: "${top.example_anon}"` : ''}`;
  return (baseFeedback + extra).slice(0, 600);
}

// Lista completa de misconceptions aprobadas (para reforzamiento/entrevista).
export async function getApprovedMisconceptions(): Promise<ApprovedMisconception[]> {
  return getApproved();
}

// Sugiere una trampa derivada de un error real aprobado, para caseGenerator.
export function trapFromMisconception(skillId: string): { trapId: string; feedback: string } | null {
  const hit = (approvedCache || []).find(m => m.skill_id === skillId);
  if (!hit) return null;
  return {
    trapId: `flywheel_${skillId.replace(/[^a-z0-9]/gi, '_')}`,
    feedback: `Trampa real detectada por el equipo: ${hit.pattern}.`,
  };
}

// Drill recomendado: si el item supera el umbral de fallo, sugiere reforzarlo.
export function drillFor(refId: string, failRate: number): { refId: string; motivo: string; accion: string } | null {
  if (failRate <= TICKET_FAIL_RATE) return null;
  return {
    refId,
    motivo: `fail_rate ${(failRate * 100).toFixed(0)}% supera el umbral de ${(TICKET_FAIL_RATE * 100).toFixed(0)}%`,
    accion: 'Agrega un micro-ejercicio de refuerzo de este ítem (drill dirigido).',
  };
}

// Cobertura de gaps por taxonomía de vacantes: skills demandados en la
// vacante (flywheel) que el alumno aún no cubre. Complementa matchScorer.
export function coverageGap(
  demanded: string[],
  coveredSkills: string[]
): Array<{ skill: string; state: 'cubierto' | 'gap' }> {
  const covered = new Set(coveredSkills.map(s => s.toLowerCase()));
  return (demanded || []).map(skill => ({
    skill,
    state: covered.has(skill.toLowerCase()) ? 'cubierto' : 'gap',
  }));
}

// Limpia cache (útil en tests).
export function resetQualityCache(): void {
  approvedCache = null;
  cacheAt = 0;
}

export { scrubText };