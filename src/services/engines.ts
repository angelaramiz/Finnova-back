// ─── PROGRESSION ENGINE ───────────────────────────────────────

export interface ProgressionResult {
  leveledUp: boolean;
  newLevel: string;
  newTitle: string;
  unlockedJob: { id: string; title: string } | null;
  milestone: string | null;
}

export function checkProgression(tasksCompleted: number, totalScore: number, currentLevel: string): ProgressionResult {
  const result: ProgressionResult = {
    leveledUp: false, newLevel: currentLevel, newTitle: currentLevel, unlockedJob: null, milestone: null,
  };

  if (currentLevel === 'Junior' && tasksCompleted >= 5) {
    result.leveledUp = true;
    result.newLevel = 'Semi-Senior';
    result.newTitle = 'Semi-Senior';
    result.unlockedJob = { id: 'b0000000-0000-0000-0000-000000000002', title: 'Analista de Cuentas por Pagar' };
    result.milestone = '¡Felicitaciones! Has sido promovido a Semi-Senior. Se desbloqueó un nuevo puesto: Analista de CxP.';
  } else if (currentLevel === 'Semi-Senior' && tasksCompleted >= 15) {
    result.leveledUp = true;
    result.newLevel = 'Senior';
    result.newTitle = 'Senior';
    result.unlockedJob = null;
    result.milestone = '¡Felicitaciones! Has alcanzado el nivel Senior. Eres un experto en contabilidad práctica.';
  }

  if (tasksCompleted === 1 && !result.leveledUp) {
    result.milestone = '¡Primera tarea completada! Sigue así para subir de nivel.';
  } else if (tasksCompleted === 3 && !result.leveledUp) {
    result.milestone = '¡Va muy bien! Completa 2 tareas más para subir a Semi-Senior.';
  } else if (tasksCompleted === 10 && currentLevel === 'Semi-Senior') {
    result.milestone = '¡10 tareas completadas! A medio camino hacia Senior.';
  }

  return result;
}

// ─── TASK STATE MACHINE ─────────────────────────────────────

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'late';

export function validateTransition(from: TaskStatus, to: TaskStatus): boolean {
  const allowed: Record<TaskStatus, TaskStatus[]> = {
    pending: ['in_progress'],
    in_progress: ['completed', 'late'],
    completed: [],
    late: ['in_progress'],
  };
  return allowed[from]?.includes(to) ?? false;
}

export function checkDeadline(deadline: string): boolean {
  return new Date() > new Date(deadline);
}

// ─── EVENT ENGINE ────────────────────────────────────────────

const EVENT_TEMPLATES = [
  { type: 'boss_message', personaje: 'Lic. Gómez', title: 'Reunión urgente', template: 'Necesitamos revisar los estados financieros antes del mediodía. Prioridad alta.' },
  { type: 'client_request', personaje: 'Cliente', title: 'Solicitud de cambio', template: 'El cliente {client} solicita modificar la factura del periodo anterior. Contacta al área de ventas.' },
  { type: 'supplier_delay', personaje: 'Proveedor', title: 'Retraso en entrega', template: 'Aviso: el proveedor {supplier} reporta retraso de 3 días en la entrega de materiales.' },
  { type: 'deadline_reminder', personaje: 'Sistema', title: 'Vencimiento próximo', template: 'Tienes una tarea que vence mañana. Recuerda completarla a tiempo para evitar penalización.' },
  { type: 'audit_notice', personaje: 'Auditoría', title: 'Revisión trimestral', template: 'La auditoría trimestral comienza la próxima semana. Asegura que todos los registros estén actualizados.' },
  { type: 'payroll_deadline', personaje: 'RRHH', title: 'Cierre de nómina', template: 'Recuerda que el cierre de nómina es este viernes. Revisa las incidencias antes del jueves.' },
];

const SUPPLIERS = ['Transportes Express S.A.', 'Papelería del Norte', 'Servicios Tech MX'];
const CLIENTS = ['Comercial del Norte S.A.', 'Transportes Rápidos S.A.', 'Almacenes del Bajío'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface SimEvent {
  type: string;
  personaje: string;
  title: string;
  message: string;
  timestamp: string;
}

export function generateRandomEvent(): SimEvent | null {
  if (Math.random() > 0.4) return null;

  const tpl = pickRandom(EVENT_TEMPLATES);
  let message = tpl.template;
  if (message.includes('{client}')) message = message.replace('{client}', pickRandom(CLIENTS));
  if (message.includes('{supplier}')) message = message.replace('{supplier}', pickRandom(SUPPLIERS));

  return { type: tpl.type, personaje: tpl.personaje, title: tpl.title, message, timestamp: new Date().toISOString() };
}

// ─── SCORE CALCULATOR ────────────────────────────────────────

export function calculateScore(difficulty: number): { score: number; maxScore: number; bonus: number } {
  const base = difficulty === 1 ? 10 : difficulty === 2 ? 25 : 40;
  const bonus = Math.floor(Math.random() * 11) + 5;
  return { score: base + bonus, maxScore: base + 20, bonus };
}
