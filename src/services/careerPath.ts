// ─── Árbol de Rutas de la especialidad Data ────────────────────
// Analista de Datos (raíz) → Ingeniería de Datos / Ciencia de Datos.
// El avance se rige EXCLUSIVAMENTE por progreso real (tasks/sims/cases);
// el atajo DEMO solo altera `unlocked` en vista, nunca `practicePct`.

export type RouteNode = 'analyst' | 'data_engineering' | 'data_science';
export type CareerEvent = 'UNLOCK' | 'CHOOSE' | 'DEMO_ON' | 'DEMO_OFF' | 'RESET';

export interface PracticeBreakdown {
  tasks: { done: number; total: number };
  sims: { validated: number; total: number };
  cases: { done: number; total: number };
}

export interface CareerPathState {
  currentNode: RouteNode;
  chosenBranch: 'data_engineering' | 'data_science' | null;
  practicePct: number;
  unlocked: { data_engineering: boolean; data_science: boolean };
  demoOverride: { enabled: boolean };
  history: { ts: string; event: CareerEvent }[];
}

export const UNLOCK_PCT = 40;

export const BRANCH_LABELS: Record<'data_engineering' | 'data_science', string> = {
  data_engineering: 'Ingeniería de Datos',
  data_science: 'Ciencia de Datos',
};

export function freshCareerPath(): CareerPathState {
  return {
    currentNode: 'analyst',
    chosenBranch: null,
    practicePct: 0,
    unlocked: { data_engineering: false, data_science: false },
    demoOverride: { enabled: false },
    history: [{ ts: new Date().toISOString(), event: 'RESET' }],
  };
}

function pct(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

export function computePracticePct(b: PracticeBreakdown): number {
  return Math.round(
    100 * (
      0.45 * pct(b.tasks.done, b.tasks.total) +
      0.35 * pct(b.sims.validated, b.sims.total) +
      0.20 * pct(b.cases.done, b.cases.total)
    )
  );
}

export function computeUnlock(practicePct: number): boolean {
  return practicePct >= UNLOCK_PCT;
}

export function applyProgress(state: CareerPathState, breakdown: PracticeBreakdown): CareerPathState {
  const practicePct = computePracticePct(breakdown);
  const unlockedByProgress = computeUnlock(practicePct);
  const demo = state.demoOverride?.enabled;
  const history = [...state.history];
  if (unlockedByProgress && (!state.unlocked.data_engineering || !state.unlocked.data_science)) {
    history.push({ ts: new Date().toISOString(), event: 'UNLOCK' });
  }
  return {
    ...state,
    practicePct,
    unlocked: {
      data_engineering: demo || unlockedByProgress,
      data_science: demo || unlockedByProgress,
    },
    history,
  };
}

export function chooseBranch(state: CareerPathState, branch: 'data_engineering' | 'data_science'): CareerPathState {
  // Irreversible: si ya eligió una rama, no puede cambiar (solo staff resetea).
  if (state.chosenBranch) return state;
  const canChoose = state.unlocked[branch] || state.demoOverride?.enabled;
  if (!canChoose) return state;
  return {
    ...state,
    currentNode: branch,
    chosenBranch: branch,
    history: [...state.history, { ts: new Date().toISOString(), event: 'CHOOSE' }],
  };
}

export function applyDemoOverride(state: CareerPathState, enabled: boolean): CareerPathState {
  const history = [...state.history];
  // El override NO toca practicePct: solo alterna la visibilidad de unlocked.
  if (enabled !== state.demoOverride?.enabled) {
    history.push({ ts: new Date().toISOString(), event: enabled ? 'DEMO_ON' : 'DEMO_OFF' });
  }
  return {
    ...state,
    demoOverride: { enabled },
    unlocked: {
      data_engineering: enabled || computeUnlock(state.practicePct),
      data_science: enabled || computeUnlock(state.practicePct),
    },
    history,
  };
}

export function resetCareer(): CareerPathState {
  return freshCareerPath();
}

export function careerAppSet(state: CareerPathState): 'analyst' | 'engineering' | 'science' {
  if (state.chosenBranch === 'data_science') return 'science';
  if (state.chosenBranch === 'data_engineering') return 'engineering';
  return 'analyst';
}
