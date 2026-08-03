// ─── Progress Tracking — Seguimiento mensual ──────────────────
// Registra completación, scores, rachas y estadísticas por día/semana.

export interface TaskCompletion {
  id: string;
  taskId: string;
  taskType: string;
  title: string;
  category: string;
  difficulty: number;
  score: number;        // 0-100
  maxScore: number;
  passed: boolean;
  completedAt: string;  // ISO date
  week: number;
  day: number;
  timeSpent: number;    // minutos
  isTrap: boolean;
  trapDetected: boolean;
  feedback?: string;
}

export interface DayProgress {
  date: string;         // YYYY-MM-DD
  day: number;
  completed: number;
  total: number;
  avgScore: number;
  tasks: TaskCompletion[];
}

export interface WeekProgress {
  week: number;
  theme: string;
  completed: number;
  total: number;
  avgScore: number;
  passed: number;
  failed: number;
  trapDetected: number;
  estimatedHours: number;
  actualHours: number;
  days: DayProgress[];
}

export interface MonthProgress {
  month: number;
  year: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  avgScore: number;
  passRate: number;
  streak: number;       // días consecutivos con al menos 1 tarea
  bestStreak: number;
  totalHours: number;
  byCategory: Record<string, { completed: number; total: number; avgScore: number }>;
  byDifficulty: Record<number, { completed: number; total: number; avgScore: number }>;
  weeks: WeekProgress[];
  recentCompletions: TaskCompletion[];
}

// ─── In-memory store ─────────────────────────────────────────

const progressStore = new Map<string, TaskCompletion[]>();

function getUserProgress(userId: string): TaskCompletion[] {
  if (!progressStore.has(userId)) progressStore.set(userId, []);
  return progressStore.get(userId)!;
}

// ─── Registrar completación ──────────────────────────────────

export function recordCompletion(userId: string, data: {
  taskId: string;
  taskType: string;
  title: string;
  category: string;
  difficulty: number;
  score: number;
  maxScore: number;
  passed: boolean;
  week: number;
  day: number;
  timeSpent: number;
  isTrap?: boolean;
  trapDetected?: boolean;
  feedback?: string;
}): TaskCompletion {
  const progress = getUserProgress(userId);
  const completion: TaskCompletion = {
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...data,
    completedAt: new Date().toISOString(),
    isTrap: data.isTrap || false,
    trapDetected: data.trapDetected || false,
  };
  progress.push(completion);
  return completion;
}

// ─── Calcular progreso del día ──────────────────────────────

function getDayProgress(userId: string, week: number, day: number): DayProgress {
  const progress = getUserProgress(userId);
  const dateStr = `2026-07-${String((week - 1) * 7 + day).padStart(2, '0')}`;
  const dayTasks = progress.filter(t => t.week === week && t.day === day);
  const total = dayTasks.length;
  const completed = dayTasks.length;
  const avgScore = total > 0 ? dayTasks.reduce((s, t) => s + t.score, 0) / total : 0;

  return {
    date: dateStr,
    day,
    completed,
    total,
    avgScore: Math.round(avgScore),
    tasks: dayTasks,
  };
}

// ─── Calcular progreso de la semana ─────────────────────────

function getWeekProgress(userId: string, week: number, theme: string): WeekProgress {
  const progress = getUserProgress(userId);
  const weekTasks = progress.filter(t => t.week === week);
  const total = weekTasks.length;
  const completed = weekTasks.length;
  const avgScore = total > 0 ? weekTasks.reduce((s, t) => s + t.score, 0) / total : 0;
  const passed = weekTasks.filter(t => t.passed).length;
  const failed = total - passed;
  const trapDetected = weekTasks.filter(t => t.isTrap && t.trapDetected).length;
  const actualHours = weekTasks.reduce((s, t) => s + t.timeSpent, 0) / 60;

  const days: DayProgress[] = [];
  for (let d = 1; d <= 5; d++) {
    days.push(getDayProgress(userId, week, d));
  }

  return {
    week,
    theme,
    completed,
    total,
    avgScore: Math.round(avgScore),
    passed,
    failed,
    trapDetected,
    estimatedHours: 8,
    actualHours: Math.round(actualHours * 10) / 10,
    days,
  };
}

// ─── Calcular progreso del mes ──────────────────────────────

const WEEK_THEMES = [
  'Inicio de mes — Facturación del mes anterior',
  'Operación normal — Cobranza y conciliación',
  'Cálculos fiscales y nómina',
  'Cierre de mes — Pólizas y reportes',
];

export function getMonthProgress(userId: string, month: number, year: number): MonthProgress {
  const progress = getUserProgress(userId);
  const totalTasks = 33; // Del TaskPlanner
  const completedTasks = progress.length;
  const pendingTasks = Math.max(0, totalTasks - completedTasks);
  const avgScore = completedTasks > 0 ? progress.reduce((s, t) => s + t.score, 0) / completedTasks : 0;
  const passed = progress.filter(t => t.passed).length;
  const passRate = completedTasks > 0 ? (passed / completedTasks) * 100 : 0;

  // Calcular racha
  const completedDates = [...new Set(progress.map(t => t.completedAt.split('T')[0]))].sort();
  let streak = 0;
  let bestStreak = 0;
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < 31; i++) {
    const dateStr = `2026-07-${String(i + 1).padStart(2, '0')}`;
    if (completedDates.includes(dateStr)) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      if (dateStr <= today) currentStreak = 0;
    }
  }
  streak = currentStreak;

  // Por categoría
  const categories = ['facturacion', 'cobranza', 'compras', 'banco', 'nomina', 'fiscal', 'cierre', 'activos', 'conciliacion', 'reportes', 'control', 'errores'];
  const byCategory: Record<string, { completed: number; total: number; avgScore: number }> = {};
  for (const cat of categories) {
    const catTasks = progress.filter(t => t.category === cat);
    byCategory[cat] = {
      completed: catTasks.length,
      total: Math.ceil(totalTasks / categories.length),
      avgScore: catTasks.length > 0 ? Math.round(catTasks.reduce((s, t) => s + t.score, 0) / catTasks.length) : 0,
    };
  }

  // Por dificultad
  const byDifficulty: Record<number, { completed: number; total: number; avgScore: number }> = {};
  for (const diff of [1, 2, 3, 4]) {
    const diffTasks = progress.filter(t => t.difficulty === diff);
    byDifficulty[diff] = {
      completed: diffTasks.length,
      total: diff === 1 ? 16 : diff === 2 ? 12 : diff === 3 ? 1 : 4,
      avgScore: diffTasks.length > 0 ? Math.round(diffTasks.reduce((s, t) => s + t.score, 0) / diffTasks.length) : 0,
    };
  }

  // Semanas
  const weeks: WeekProgress[] = [];
  for (let w = 1; w <= 4; w++) {
    weeks.push(getWeekProgress(userId, w, WEEK_THEMES[w - 1]));
  }

  const totalHours = progress.reduce((s, t) => s + t.timeSpent, 0) / 60;

  return {
    month,
    year,
    totalTasks,
    completedTasks,
    pendingTasks,
    avgScore: Math.round(avgScore),
    passRate: Math.round(passRate),
    streak,
    bestStreak,
    totalHours: Math.round(totalHours * 10) / 10,
    byCategory,
    byDifficulty,
    weeks,
    recentCompletions: progress.slice(-10).reverse(),
  };
}

// ─── Resumen rápido ─────────────────────────────────────────

export function getQuickStats(userId: string) {
  const progress = getUserProgress(userId);
  const today = new Date().toISOString().split('T')[0];
  const todayCompletions = progress.filter(t => t.completedAt.startsWith(today));

  return {
    totalCompleted: progress.length,
    todayCompleted: todayCompletions.length,
    todayAvgScore: todayCompletions.length > 0
      ? Math.round(todayCompletions.reduce((s, t) => s + t.score, 0) / todayCompletions.length)
      : 0,
    streak: calculateStreak(progress),
  };
}

function calculateStreak(progress: TaskCompletion[]): number {
  const dates = [...new Set(progress.map(t => t.completedAt.split('T')[0]))].sort().reverse();
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 31; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    if (dates.includes(dateStr)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
