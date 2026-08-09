// ─── Progress Tracking v2 — Seguimiento por especialidad ──────
// Cada usuario tiene progreso separado para Accounting y Data Engineering.

export interface TaskCompletion {
  id: string;
  taskId: string;
  taskType: string;
  title: string;
  category: string;
  specialty: string;      // 'accounting' | 'data_engineering'
  difficulty: number;
  score: number;          // 0-100
  maxScore: number;
  passed: boolean;
  completedAt: string;    // ISO date
  week: number;
  day: number;
  timeSpent: number;      // minutos
  isTrap: boolean;
  trapDetected: boolean;
  feedback?: string;
}

export interface RoleProgress {
  specialty: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  avgScore: number;
  passRate: number;
  streak: number;
  bestStreak: number;
  totalHours: number;
  byCategory: Record<string, { completed: number; total: number; avgScore: number }>;
  byDifficulty: Record<number, { completed: number; total: number; avgScore: number }>;
  recentCompletions: TaskCompletion[];
  weekProgress: { week: number; completed: number; total: number; avgScore: number }[];
}

// ─── In-memory store por usuario y especialidad ───────────────

const progressStore = new Map<string, Map<string, TaskCompletion[]>>();

function getUserProgress(userId: string, specialty: string): TaskCompletion[] {
  if (!progressStore.has(userId)) progressStore.set(userId, new Map());
  const userMap = progressStore.get(userId)!;
  if (!userMap.has(specialty)) userMap.set(specialty, []);
  return userMap.get(specialty)!;
}

// ─── Registrar completación ──────────────────────────────────

export function recordCompletion(userId: string, data: {
  taskId: string;
  taskType: string;
  title: string;
  category: string;
  specialty: string;
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
  const progress = getUserProgress(userId, data.specialty);
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

// ─── Obtener progreso por especialidad ───────────────────────

export function getRoleProgress(userId: string, specialty: string, totalTasks: number = 33): RoleProgress {
  const progress = getUserProgress(userId, specialty);
  const completedTasks = progress.length;
  const pendingTasks = Math.max(0, totalTasks - completedTasks);
  const avgScore = completedTasks > 0 ? Math.round(progress.reduce((s, t) => s + t.score, 0) / completedTasks) : 0;
  const passed = progress.filter(t => t.passed).length;
  const passRate = completedTasks > 0 ? Math.round((passed / completedTasks) * 100) : 0;

  // Calcular racha
  const dates = [...new Set(progress.map(t => t.completedAt.split('T')[0]))].sort().reverse();
  let streak = 0;
  let bestStreak = 0;
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < 31; i++) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    if (dates.includes(dateStr)) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      if (dateStr <= today) currentStreak = 0;
    }
  }
  streak = currentStreak;

  // Por categoría
  const byCategory: Record<string, { completed: number; total: number; avgScore: number }> = {};
  for (const task of progress) {
    if (!byCategory[task.category]) byCategory[task.category] = { completed: 0, total: 0, avgScore: 0 };
    byCategory[task.category].completed++;
    byCategory[task.category].avgScore = Math.round(byCategory[task.category].completed > 0 ? progress.filter(t => t.category === task.category).reduce((s, t) => s + t.score, 0) / byCategory[task.category].completed : 0);
  }

  // Por dificultad
  const byDifficulty: Record<number, { completed: number; total: number; avgScore: number }> = {};
  for (const task of progress) {
    if (!byDifficulty[task.difficulty]) byDifficulty[task.difficulty] = { completed: 0, total: 0, avgScore: 0 };
    byDifficulty[task.difficulty].completed++;
    byDifficulty[task.difficulty].avgScore = Math.round(byDifficulty[task.difficulty].completed > 0 ? progress.filter(t => t.difficulty === task.difficulty).reduce((s, t) => s + t.score, 0) / byDifficulty[task.difficulty].completed : 0);
  }

  // Progreso por semana
  const weekProgress = [];
  for (let w = 1; w <= 4; w++) {
    const weekTasks = progress.filter(t => t.week === w);
    weekProgress.push({
      week: w,
      completed: weekTasks.length,
      total: Math.ceil(totalTasks / 4),
      avgScore: weekTasks.length > 0 ? Math.round(weekTasks.reduce((s, t) => s + t.score, 0) / weekTasks.length) : 0,
    });
  }

  const totalHours = Math.round(progress.reduce((s, t) => s + t.timeSpent, 0) / 60 * 10) / 10;

  return {
    specialty,
    totalTasks,
    completedTasks,
    pendingTasks,
    avgScore,
    passRate,
    streak,
    bestStreak,
    totalHours,
    byCategory,
    byDifficulty,
    recentCompletions: progress.slice(-10).reverse(),
    weekProgress,
  };
}

// ─── Obtener progreso rápido ─────────────────────────────────

export function getQuickStats(userId: string, specialty: string) {
  const progress = getUserProgress(userId, specialty);
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
