import { Router, Response } from 'express';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';
import { MemoryDatabase } from '../lib/memoryDb';
import { generateDocument } from '../services/documentGenerator';
import { calculateScore, checkProgression, checkDeadline, validateTransition, generateRandomEvent } from '../services/engines';
import { generateInvoiceEntries, generatePaymentEntries, generateSupplierEntries, generatePayrollEntries, generateJournalEntryForType, JournalEntry } from '../services/autoEntries';
import { suggestMatches, confirmMatch, getPendingInvoices } from '../services/paymentMatching';
import { getChartOfAccounts, updateBalance, getAccountSummary, generateBalanceGeneral, generateEstadoResultados, generateBalanzaComprobacion } from '../services/chartOfAccounts';
import { getCompany, getClients, getSuppliers, getProducts, getTransactions } from '../services/persistentData';
import { generateMonthPlan, getTodayTasks, getWeekTasks, getMonthStats } from '../services/taskPlanner';
import { TRAP_SCENARIOS } from '../services/workflowEngine';
import { getWorld, addAction, resetWorld, getCareerPath, saveCareerPath } from '../services/simWorld';
import { applyProgress, chooseBranch, applyDemoOverride, PracticeBreakdown, careerAppSet } from '../services/careerPath';
import { ALL_EXERCISES, getExerciseById, getExercisesByType, getExercisesByDifficulty } from '../services/excelExercises';
import { recordCompletion, getRoleProgress, getQuickStats, computePracticeBreakdown } from '../services/progressTracker';
import { buildSkillProfile, buildDemoSkillProfile } from '../services/skillProfile';
import { getCvExtra, saveCvExtra, generateCvLatex, CvProfileData, CvExtraData } from '../services/cvProfile';
import { generateCvPdf } from '../services/cvPdf';
import { buildExpediente, generateSlug } from '../services/expediente';
import { startInterview, completarEntrevista, InterviewAnswer } from '../services/interview';
import { buildPlanRefuerzo } from '../services/reforzamiento';
import { getDEWorkflow, DE_WORKFLOWS } from '../services/dataEngineeringWorkflows';
import { SQL_EXERCISES, PYTHON_EXERCISES, getSQLExercise, getPythonExercise } from '../services/dataExercises';

// In-memory store for generated journal entries per user
const journalStore = new Map<string, JournalEntry[]>();

export const simEngineRouter = Router();

simEngineRouter.get('/health', (_req, res: Response) => {
  res.json({ status: 'ok', engine: 'sim-engine v0.1', timestamp: new Date().toISOString() });
});

simEngineRouter.get('/companies', requireSupabaseAuth, async (_req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseReady()) {
    const { data, error } = await supabaseAdmin.from('sim_companies').select('*');
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data || []);
    return;
  }
  res.json(MemoryDatabase.simCompanies);
});

simEngineRouter.get('/jobs', requireSupabaseAuth, async (_req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseReady()) {
    const { data, error } = await supabaseAdmin.from('sim_jobs').select('*');
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data || []);
    return;
  }
  res.json(MemoryDatabase.simJobs);
});

simEngineRouter.get('/tasks/:jobId', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { jobId } = req.params;
  if (isSupabaseReady()) {
    const { data, error } = await supabaseAdmin
      .from('sim_tasks')
      .select('*')
      .eq('job_id', jobId)
      .eq('is_active', true)
      .order('sequence_order', { ascending: true });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data || []);
    return;
  }
  const tasks = MemoryDatabase.simTasks
    .filter(t => t.jobId === jobId)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  res.json(tasks);
});

simEngineRouter.get('/user-tasks', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

  if (isSupabaseReady()) {
    const { data, error } = await supabaseAdmin
      .from('user_tasks')
      .select('*, sim_tasks(*)')
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data || []);
    return;
  }
  res.json(MemoryDatabase.simTasks);
});

simEngineRouter.post('/assign', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

  const { jobId } = req.body;
  const tasks = MemoryDatabase.simTasks
    .filter(t => t.jobId === jobId)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  if (tasks.length === 0) {
    res.status(404).json({ error: 'No hay tareas para este puesto' });
    return;
  }

  const now = new Date();
  const assigned = tasks.map((t, i) => {
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + (i + 1));
    return {
      id: `ut-${crypto.randomUUID().slice(0, 8)}`,
      userId,
      taskId: t.id,
      status: 'pending',
      assignedAt: now.toISOString(),
      deadline: deadline.toISOString(),
    };
  });

  res.json({ assigned, count: assigned.length });
});

simEngineRouter.post('/tasks/:id/complete', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { id } = req.params;

  const task = MemoryDatabase.simTasks.find(t => t.id === id);
  if (!task) { res.status(404).json({ error: 'Tarea no encontrada' }); return; }

  const { score, maxScore, bonus } = calculateScore(task.difficulty);
  const timeSpent = Math.floor(task.estimatedMinutes * (0.3 + Math.random() * 0.7));

  // Actualizar estadisticas
  if (!MemoryDatabase.userStats) MemoryDatabase.userStats = new Map();
  const prev = MemoryDatabase.userStats.get(userId) || { tasksCompleted: 0, totalScore: 0, totalTime: 0, lastTaskDate: null, level: 'Junior', history: [] as any[] };
  prev.tasksCompleted++;
  prev.totalScore += score;
  prev.totalTime += timeSpent;
  prev.lastTaskDate = new Date().toISOString();
  prev.history = prev.history || [];
  prev.history.push({ taskId: id, taskTitle: task.title, score, maxScore, passed: score >= (maxScore * 0.6), completedAt: new Date().toISOString() });
  if (prev.history.length > 20) prev.history = prev.history.slice(-20);

  // Progression check
  const prog = checkProgression(prev.tasksCompleted, prev.totalScore, prev.level);
  if (prog.leveledUp) {
    prev.level = prog.newLevel;
    prev.milestones = prev.milestones || [];
    prev.milestones.push({ date: new Date().toISOString(), milestone: prog.milestone, unlockedJob: prog.unlockedJob });
  }
  MemoryDatabase.userStats.set(userId, prev);

  res.json({
    taskId: id, taskTitle: task.title, userId,
    score, maxScore, timeSpent, estimatedMinutes: task.estimatedMinutes,
    passed: score >= (maxScore * 0.6), completedAt: new Date().toISOString(),
    progression: prog,
    feedback: score >= (maxScore * 0.8)
      ? '¡Excelente trabajo! Completaste la tarea con precisión.'
      : score >= (maxScore * 0.6)
        ? 'Bien hecho. Revisa algunos detalles para mejorar.'
        : 'Tarea completada. Revisa los procedimientos y vuelve a intentarlo.',
  });
});

simEngineRouter.get('/my-stats', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

  const allStats = MemoryDatabase.userStats || new Map();
  const stats = allStats.get(userId) || {
    tasksCompleted: 0, totalScore: 0, totalTime: 0,
    lastTaskDate: null, level: 'Junior', history: [],
  };

  res.json(stats);
});

simEngineRouter.get('/events/random', requireSupabaseAuth, async (_req: AuthenticatedRequest, res: Response) => {
  const event = generateRandomEvent();
  res.json(event ? { event } : { event: null });
});

// ─── Auto-generación de asientos ───────────────────────────────
simEngineRouter.post('/generate-entries', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { type, data } = req.body;
  let entries: any[] = [];
  switch (type) {
    case 'invoice': entries = generateInvoiceEntries(data); break;
    case 'payment': entries = generatePaymentEntries(data); break;
    case 'supplier': entries = generateSupplierEntries(data); break;
    case 'payroll': entries = generatePayrollEntries(data); break;
    case 'journal': entries = generateJournalEntryForType(data); break;
    default: res.status(400).json({ error: 'Tipo no válido' }); return;
  }
  if (!journalStore.has(userId)) journalStore.set(userId, []);
  journalStore.get(userId)!.push(...entries);
  res.json({ entries, totalGenerated: entries.length });
});

simEngineRouter.get('/journal', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const entries = journalStore.get(userId) || [];
  res.json(entries);
});

simEngineRouter.post('/journal', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { date, ref, desc, account, debit, credit } = req.body;
  if (!desc || !account) { res.status(400).json({ error: 'Faltan desc y account' }); return; }
  const entry: JournalEntry = {
    date: date || new Date().toLocaleDateString('es-MX'),
    ref: ref || `POL-${Date.now()}`,
    desc,
    account,
    debit: Number(debit) || 0,
    credit: Number(credit) || 0,
    type: 'manual',
  };
  if (!journalStore.has(userId)) journalStore.set(userId, []);
  journalStore.get(userId)!.push(entry);
  res.json(entry);
});

// ─── Matching de pagos ─────────────────────────────────────────
simEngineRouter.post('/suggest-matches', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { clientName, amount } = req.body;
  if (!clientName || !amount) { res.status(400).json({ error: 'Faltan clientName o amount' }); return; }
  const suggestions = suggestMatches(userId, { clientName, amount: Number(amount) });
  res.json(suggestions);
});

simEngineRouter.post('/confirm-match', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { invoiceNumber, paymentId } = req.body;
  const ok = confirmMatch(userId, invoiceNumber, paymentId);
  if (ok) { res.json({ success: true }); } else { res.status(404).json({ error: 'Factura no encontrada' }); }
});

simEngineRouter.get('/pending-invoices', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const invoices = getPendingInvoices(userId);
  res.json(invoices);
});

// ─── Catálogo de cuentas ──────────────────────────────────────
simEngineRouter.get('/chart-of-accounts', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const accounts = getChartOfAccounts(userId);
  res.json(accounts);
});

simEngineRouter.post('/update-balance', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { accountCode, amount, operation } = req.body;
  const ok = updateBalance(userId, accountCode, amount, operation);
  if (ok) { res.json({ success: true }); } else { res.status(404).json({ error: 'Cuenta no encontrada' }); }
});

simEngineRouter.get('/account-summary', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const summary = getAccountSummary(userId);
  res.json(summary);
});

// ─── Reportes financieros ─────────────────────────────────────
simEngineRouter.get('/reports/balance-general', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const report = generateBalanceGeneral(userId);
  res.json(report);
});

simEngineRouter.get('/reports/estado-resultados', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const report = generateEstadoResultados(userId);
  res.json(report);
});

simEngineRouter.get('/reports/balanza-comprobacion', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const report = generateBalanzaComprobacion(userId);
  res.json(report);
});

// ─── Datos persistentes ───────────────────────────────────────
simEngineRouter.get('/company', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  res.json(getCompany(userId));
});

simEngineRouter.get('/clients', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  res.json(getClients(userId));
});

simEngineRouter.get('/suppliers', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  res.json(getSuppliers(userId));
});

simEngineRouter.get('/products', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  res.json(getProducts(userId));
});

simEngineRouter.get('/transactions', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  res.json(getTransactions(userId));
});

// ─── Planificador de tareas ──────────────────────────────────
simEngineRouter.get('/task-plan/:month/:year', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const month = parseInt(req.params.month) || 6;
  const year = parseInt(req.params.year) || 2026;
  const specialty = (req.query.specialty as string) || 'accounting';
  const plan = generateMonthPlan(month, year, specialty);
  res.json(plan);
});

simEngineRouter.get('/today-tasks/:month/:year/:week/:day', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const month = parseInt(req.params.month) || 6;
  const year = parseInt(req.params.year) || 2026;
  const week = parseInt(req.params.week) || 1;
  const day = parseInt(req.params.day) || 1;
  const specialty = (req.query.specialty as string) || 'accounting';
  const tasks = getTodayTasks(month, year, week, day, specialty);
  res.json(tasks);
});

simEngineRouter.get('/week-tasks/:month/:year/:week', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const month = parseInt(req.params.month) || 6;
  const year = parseInt(req.params.year) || 2026;
  const week = parseInt(req.params.week) || 1;
  const specialty = (req.query.specialty as string) || 'accounting';
  const tasks = getWeekTasks(month, year, week, specialty);
  res.json(tasks);
});

simEngineRouter.get('/month-stats/:month/:year', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const month = parseInt(req.params.month) || 6;
  const year = parseInt(req.params.year) || 2026;
  const specialty = (req.query.specialty as string) || 'accounting';
  const stats = getMonthStats(month, year, specialty);
  res.json(stats);
});

simEngineRouter.get('/task-knowledge/:taskType', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { taskType } = req.params;
  // Knowledge base for common task types
  const knowledge: Record<string, any> = {
    invoice_emission: { why: 'Facturar correctamente es obligatorio', tips: ['Verifica RFC', 'IVA es 16%'] },
    payment_registration: { why: 'Un pago mal registrado causa problemas', tips: ['Verifica referencia bancaria'] },
    sql_query: { why: 'SQL es fundamental para datos', tips: ['GROUP BY con agregaciones', 'Verifica claves de JOIN'] },
    etl_pipeline: { why: 'ETL convierte datos en información útil', tips: ['Limpia primero', 'Registra métricas'] },
  };
  const k = knowledge[taskType];
  if (k) { res.json(k); } else { res.status(404).json({ error: 'Tipo no encontrado' }); }
});

simEngineRouter.get('/trap-scenarios', requireSupabaseAuth, async (_req: AuthenticatedRequest, res: Response) => {
  res.json(TRAP_SCENARIOS);
});

// ─── Mundo simulado (estado global DE) ────────────────────────
simEngineRouter.get('/world', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  res.json(await getWorld(userId));
});

simEngineRouter.post('/world/action', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { type, detail } = req.body || {};
  if (!type) { res.status(400).json({ error: 'type es requerido' }); return; }
  res.json(await addAction(userId, type, String(detail || type)));
});

simEngineRouter.post('/world/reset', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  res.json(await resetWorld(userId));
});

// ─── Ejercicios Excel ────────────────────────────────────────
simEngineRouter.get('/exercises', requireSupabaseAuth, async (_req: AuthenticatedRequest, res: Response) => {
  res.json(ALL_EXERCISES.map(e => ({ id: e.id, title: e.title, type: e.type, difficulty: e.difficulty, timeMinutes: e.timeMinutes })));
});

simEngineRouter.get('/exercises/:id', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const exercise = getExerciseById(req.params.id);
  if (exercise) { res.json(exercise); } else { res.status(404).json({ error: 'Ejercicio no encontrado' }); }
});

simEngineRouter.get('/exercises/type/:type', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const exercises = getExercisesByType(req.params.type as any);
  res.json(exercises);
});

simEngineRouter.get('/exercises/difficulty/:level', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const level = parseInt(req.params.level) || 1;
  const exercises = getExercisesByDifficulty(level);
  res.json(exercises);
});

// ─── Progress Tracking ────────────────────────────────────────
simEngineRouter.post('/progress/record', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { taskId, taskType, title, category, specialty, difficulty, score, maxScore, passed, week, day, timeSpent, isTrap, trapDetected, feedback } = req.body;
  const completion = await recordCompletion(userId, { taskId, taskType, title, category, specialty: specialty || 'accounting', difficulty, score, maxScore, passed, week, day, timeSpent, isTrap, trapDetected, feedback });
  res.json(completion);
});

simEngineRouter.get('/progress/month/:month/:year', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const month = parseInt(req.params.month) || 6;
  const year = parseInt(req.params.year) || 2026;
  const specialty = (req.query.specialty as string) || 'accounting';
  const progress = await getRoleProgress(userId, specialty);
  res.json(progress);
});

simEngineRouter.get('/progress/quick', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const specialty = (req.query.specialty as string) || 'accounting';
  const stats = await getQuickStats(userId, specialty);
  res.json(stats);
});

simEngineRouter.get('/progress/all', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const accounting = await getRoleProgress(userId, 'accounting');
  const dataEngineering = await getRoleProgress(userId, 'data_engineering');
  res.json({ accounting, dataEngineering });
});

// ─── Data Engineering Workflows ────────────────────────────────
simEngineRouter.get('/de/workflows', requireSupabaseAuth, async (_req: AuthenticatedRequest, res: Response) => {
  res.json(Object.keys(DE_WORKFLOWS));
});

simEngineRouter.get('/de/workflow/:type', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { type } = req.params;
  const workflow = getDEWorkflow(type);
  if (workflow) { res.json(workflow); } else { res.status(404).json({ error: 'Workflow no encontrado' }); }
});

// ─── SQL & Python Exercises ───────────────────────────────────
simEngineRouter.get('/de/sql-exercises', requireSupabaseAuth, async (_req: AuthenticatedRequest, res: Response) => {
  res.json(SQL_EXERCISES.map(e => ({ id: e.id, title: e.title, difficulty: e.difficulty, timeMinutes: e.timeMinutes })));
});

simEngineRouter.get('/de/sql-exercises/:id', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const exercise = getSQLExercise(req.params.id);
  if (exercise) { res.json(exercise); } else { res.status(404).json({ error: 'Ejercicio no encontrado' }); }
});

simEngineRouter.get('/de/python-exercises', requireSupabaseAuth, async (_req: AuthenticatedRequest, res: Response) => {
  res.json(PYTHON_EXERCISES.map(e => ({ id: e.id, title: e.title, difficulty: e.difficulty, timeMinutes: e.timeMinutes })));
});

simEngineRouter.get('/de/python-exercises/:id', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const exercise = getPythonExercise(req.params.id);
  if (exercise) { res.json(exercise); } else { res.status(404).json({ error: 'Ejercicio no encontrado' }); }
});

// ─── Data Warehouse Schema ────────────────────────────────────
simEngineRouter.get('/de/warehouse-schema', requireSupabaseAuth, async (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    dimensiones: ['dim_cliente', 'dim_producto', 'dim_fecha'],
    hechos: ['fact_ventas', 'fact_inventario'],
    relaciones: [
      { from: 'dim_cliente', to: 'fact_ventas', key: 'cliente_key' },
      { from: 'dim_producto', to: 'fact_ventas', key: 'producto_key' },
      { from: 'dim_fecha', to: 'fact_ventas', key: 'fecha_key' },
    ],
  });
});

// ─── Pipeline Monitor ─────────────────────────────────────────
simEngineRouter.get('/de/pipeline-runs', requireSupabaseAuth, async (_req: AuthenticatedRequest, res: Response) => {
  res.json([
    { id: 'run-001', name: 'ventas_diarias', status: 'success', startTime: '06:00', duration: '12m 34s', tasks: 5, progress: 100 },
    { id: 'run-002', name: 'inventario_sync', status: 'running', startTime: '06:15', duration: '8m 12s', tasks: 4, progress: 65 },
    { id: 'run-003', name: 'nómina_quincenal', status: 'failed', startTime: '06:30', duration: '5m 02s', tasks: 6, progress: 40 },
    { id: 'run-004', name: 'reportes_mensuales', status: 'queued', startTime: '—', duration: '—', tasks: 8, progress: 0 },
  ]);
});

// ─── ONBOARDING & SUBSCRIPTION ────────────────────────────────

// ─── Árbol de Rutas Data (R-07) ───────────────────────────────

// GET /api/sim/career-path — Estado del árbol de rutas + breakdown
simEngineRouter.get('/career-path', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  try {
    const careerPath = await getCareerPath(userId);
    const breakdown = await computePracticeBreakdown(userId, 'data_engineering');
    const next = applyProgress(careerPath, breakdown);
    if (next.practicePct !== careerPath.practicePct) await saveCareerPath(userId, next);
    res.json({ careerPath: { ...next, breakdown }, appSet: careerAppSet(next) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sim/career-path/choose {branch} — Elegir rama (irreversible)
simEngineRouter.post('/career-path/choose', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { branch } = req.body || {};
  if (!['data_engineering', 'data_science'].includes(branch)) {
    res.status(400).json({ error: 'Rama inválida. Usa data_engineering o data_science.' });
    return;
  }
  try {
    const careerPath = await getCareerPath(userId);
    const breakdown = await computePracticeBreakdown(userId, 'data_engineering');
    const withProgress = applyProgress(careerPath, breakdown);
    const next = chooseBranch(withProgress, branch);
    await saveCareerPath(userId, next);
    await addAction(userId, 'career_choose', `Ruta elegida: ${branch}`);
    res.json({ careerPath: { ...next, breakdown } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sim/career-path/demo-override {enabled} — Atajo demo (vista)
simEngineRouter.post('/career-path/demo-override', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const enabled = !!(req.body?.enabled);
  try {
    const careerPath = await getCareerPath(userId);
    const breakdown = await computePracticeBreakdown(userId, 'data_engineering');
    const withProgress = applyProgress(careerPath, breakdown);
    const next = applyDemoOverride(withProgress, enabled);
    await saveCareerPath(userId, next);
    await addAction(userId, enabled ? 'career_demo_on' : 'career_demo_off', 'Atajo demo de rutas');
    res.json({ careerPath: { ...next, breakdown } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── CV Institucional (perfil de egreso con marca) ────────────

// GET /api/sim/cv-profile — datos extra + perfil de habilidades
// ?demo=analyst|engineering|science|accounting → perfil "como si completado"
simEngineRouter.get('/cv-profile', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  try {
    const demo = req.query.demo as string | undefined;
    const specialty = (req.query.specialty as string) === 'data_engineering' ? 'data_engineering' : 'accounting';
    const extra = await getCvExtra(userId);
    if (demo) {
      const role = (['analyst', 'engineering', 'science', 'accounting'].includes(demo) ? demo : 'analyst') as 'analyst' | 'engineering' | 'science' | 'accounting';
      const skills = buildDemoSkillProfile(role);
      const profile: CvProfileData = {
        specialty: role === 'accounting' ? 'accounting' : 'data_engineering',
        branch: role,
        practicePct: 88, // demo: "ya casi completo"
        skills: skills.skills,
        overall: skills.overall,
        strengths: skills.strengths,
        gaps: skills.gaps,
        extra,
      };
      res.json(profile);
      return;
    }
    const [skills, breakdown] = await Promise.all([
      buildSkillProfile(userId, specialty),
      computePracticeBreakdown(userId, specialty),
    ]);
    const profile: CvProfileData = {
      specialty,
      branch: skills.branch,
      practicePct: Math.round(100 * (0.45 * (breakdown.tasks.done / Math.max(breakdown.tasks.total, 1)) + 0.35 * (breakdown.sims.validated / Math.max(breakdown.sims.total, 1)) + 0.20 * (breakdown.cases.done / Math.max(breakdown.cases.total, 1)))),
      skills: skills.skills,
      overall: skills.overall,
      strengths: skills.strengths,
      gaps: skills.gaps,
      extra,
    };
    res.json(profile);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sim/cv-profile — guardar datos extra del CV
simEngineRouter.post('/cv-profile', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  try {
    const extra = await saveCvExtra(userId, (req.body || {}) as CvExtraData);
    res.json({ success: true, extra });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sim/cv/pdf — PDF semántico del CV con marca
// ?demo=<role> → PDF demo "como si completado"
simEngineRouter.get('/cv/pdf', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  try {
    const demo = req.query.demo as string | undefined;
    const specialty = (req.query.specialty as string) === 'data_engineering' ? 'data_engineering' : 'accounting';
    const extra = await getCvExtra(userId);
    let profile: CvProfileData;
    if (demo) {
      const role = (['analyst', 'engineering', 'science', 'accounting'].includes(demo) ? demo : 'analyst') as 'analyst' | 'engineering' | 'science' | 'accounting';
      const skills = buildDemoSkillProfile(role);
      profile = {
        specialty: role === 'accounting' ? 'accounting' : 'data_engineering',
        branch: role,
        practicePct: 88,
        skills: skills.skills,
        overall: skills.overall,
        strengths: skills.strengths,
        gaps: skills.gaps,
        extra,
      };
    } else {
      const [skills, breakdown] = await Promise.all([
        buildSkillProfile(userId, specialty),
        computePracticeBreakdown(userId, specialty),
      ]);
      profile = {
        specialty,
        branch: skills.branch,
        practicePct: Math.round(100 * (0.45 * (breakdown.tasks.done / Math.max(breakdown.tasks.total, 1)) + 0.35 * (breakdown.sims.validated / Math.max(breakdown.sims.total, 1)) + 0.20 * (breakdown.cases.done / Math.max(breakdown.cases.total, 1)))),
        skills: skills.skills,
        overall: skills.overall,
        strengths: skills.strengths,
        gaps: skills.gaps,
        extra,
      };
    }
    const pdf = await generateCvPdf(profile);
    const name = (extra.fullName || 'alumno').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'alumno';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CV-${name}.pdf"`);
    res.send(pdf);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sim/cv/tex — fuente .tex para Overleaf
// ?demo=<role> → .tex demo "como si completado"
simEngineRouter.get('/cv/tex', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  try {
    const demo = req.query.demo as string | undefined;
    const specialty = (req.query.specialty as string) === 'data_engineering' ? 'data_engineering' : 'accounting';
    const extra = await getCvExtra(userId);
    let profile: CvProfileData;
    if (demo) {
      const role = (['analyst', 'engineering', 'science', 'accounting'].includes(demo) ? demo : 'analyst') as 'analyst' | 'engineering' | 'science' | 'accounting';
      const skills = buildDemoSkillProfile(role);
      profile = {
        specialty: role === 'accounting' ? 'accounting' : 'data_engineering',
        branch: role,
        practicePct: 88,
        skills: skills.skills,
        overall: skills.overall,
        strengths: skills.strengths,
        gaps: skills.gaps,
        extra,
      };
    } else {
      const [skills, breakdown] = await Promise.all([
        buildSkillProfile(userId, specialty),
        computePracticeBreakdown(userId, specialty),
      ]);
      profile = {
        specialty,
        branch: skills.branch,
        practicePct: Math.round(100 * (0.45 * (breakdown.tasks.done / Math.max(breakdown.tasks.total, 1)) + 0.35 * (breakdown.sims.validated / Math.max(breakdown.sims.total, 1)) + 0.20 * (breakdown.cases.done / Math.max(breakdown.cases.total, 1)))),
        skills: skills.skills,
        overall: skills.overall,
        strengths: skills.strengths,
        gaps: skills.gaps,
        extra,
      };
    }
    const tex = generateCvLatex(profile);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cv.tex"');
    res.send(tex);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Expediente verificable (R-08 Fase 1) ─────────────────────

// GET /api/sim/expediente — expediente del alumno (logros + resumen)
simEngineRouter.get('/expediente', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  try {
    const specialty = (req.query.specialty as string) === 'data_engineering' ? 'data_engineering' : 'accounting';
    const expediente = await buildExpediente(userId, specialty);
    // Incluir el link activo si existe
    let link: any = null;
    if (isSupabaseReady()) {
      const { data } = await supabaseAdmin
        .from('verification_links')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .maybeSingle();
      if (data) link = data;
    }
    res.json({ ...expediente, link });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sim/expediente/link — crear link público de verificación
simEngineRouter.post('/expediente/link', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  try {
    const specialty = (req.query.specialty as string) === 'data_engineering' ? 'data_engineering' : 'accounting';
    const expediente = await buildExpediente(userId, specialty);
    // Requiere al menos 3 logros para ser creíble
    if (expediente.logros.length < 3) {
      res.status(400).json({ error: 'Aún no tienes suficientes logros verificables (mínimo 3).' });
      return;
    }
    if (isSupabaseReady()) {
      // Revocar links previos activos y crear uno nuevo
      await supabaseAdmin.from('verification_links')
        .update({ active: false, revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('active', true);
      const slug = generateSlug();
      const { data, error } = await supabaseAdmin.from('verification_links')
        .insert({ slug, user_id: userId, active: true, created_at: new Date().toISOString() })
        .select('*')
        .single();
      if (error) throw error;
      res.json({ link: data });
    } else {
      const slug = generateSlug();
      res.json({ link: { slug, user_id: userId, active: true, created_at: new Date().toISOString() } });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sim/expediente/link/revoke — revocar link activo
simEngineRouter.post('/expediente/link/revoke', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  try {
    if (isSupabaseReady()) {
      await supabaseAdmin.from('verification_links')
        .update({ active: false, revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('active', true);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /expediente/:slug — página pública con sello de verificación (sin auth)
simEngineRouter.get('/expediente/:slug', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseReady()) {
      res.status(404).send('Expediente no encontrado (demo)');
      return;
    }
    const { slug } = req.params;
    const { data: link, error } = await supabaseAdmin
      .from('verification_links')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error || !link || !link.active) {
      res.status(404).send('Link de verificación no encontrado o revocado');
      return;
    }
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('fullName,specialty,email')
      .eq('id', link.user_id)
      .maybeSingle();
    const specialty = profile?.specialty === 'data_engineering' ? 'data_engineering' : 'accounting';
    const expediente = await buildExpediente(link.user_id, specialty, true);
    const name = profile?.fullName || profile?.email || 'Alumno';

    const html = renderExpedientePublicPage(name, expediente, link.revoked_at);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e: any) {
    res.status(500).send('Error al cargar el expediente');
  }
});

function renderExpedientePublicPage(name: string, expediente: any, revokedAt: string | null): string {
  const logrosHtml = expediente.logros.map((l: any) => `
    <div class="logro">
      <div class="logro-titulo">${l.titulo}</div>
      <div class="logro-datos">${l.datos}</div>
      <div class="logro-meta">${new Date(l.fecha).toLocaleDateString('es-MX')} · ${l.categoria}</div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Expediente Verificado — ${name}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#0f172a; color:#e2e8f0; padding:24px; }
.container { max-width:760px; margin:0 auto; }
.sello { display:inline-flex; align-items:center; gap:8px; background:#22c55e20; border:1px solid #22c55e50; color:#4ade80; padding:6px 14px; border-radius:999px; font-size:.8rem; font-weight:600; margin-bottom:16px; }
.sello-revocado { background:#ef444420; border-color:#ef444450; color:#f87171; }
h1 { font-size:1.6rem; margin-bottom:4px; }
.sub { color:#94a3b8; font-size:.9rem; margin-bottom:24px; }
.grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:24px; }
.card { background:#1e293b; border:1px solid #334155; border-radius:12px; padding:16px; }
.card .v { font-size:1.4rem; font-weight:700; color:#FFB162; }
.card .l { font-size:.75rem; color:#94a3b8; text-transform:uppercase; letter-spacing:.5px; }
h2 { font-size:1rem; margin:24px 0 12px; color:#FFB162; }
.logro { background:#1e293b; border:1px solid #334155; border-radius:10px; padding:14px; margin-bottom:10px; }
.logro-titulo { font-weight:600; font-size:.95rem; }
.logro-datos { color:#94a3b8; font-size:.85rem; margin-top:4px; }
.logro-meta { color:#64748b; font-size:.7rem; margin-top:6px; text-transform:capitalize; }
.footer { margin-top:32px; padding-top:16px; border-top:1px solid #334155; color:#64748b; font-size:.75rem; }
.footer .sello-institucional { color:#FFB162; font-weight:600; }
</style>
</head>
<body>
<div class="container">
  <div class="sello ${revokedAt ? 'sello-revocado' : ''}">✓ ${revokedAt ? 'LINK REVOCADO' : 'EXPEDIENTE VERIFICADO'}</div>
  <h1>${name}</h1>
  <div class="sub">${expediente.specialty === 'data_engineering' ? 'Especialidad Data · Rama ' + expediente.branch : 'Contabilidad'} · Expediente de logros verificables</div>

  <div class="grid">
    <div class="card"><div class="v">${expediente.resumen.totalTareas}</div><div class="l">Tareas completadas</div></div>
    <div class="card"><div class="v">${expediente.resumen.scorePromedio}%</div><div class="l">Score promedio</div></div>
    <div class="card"><div class="v">${expediente.resumen.horasInvertidas}</div><div class="l">Horas de práctica</div></div>
    <div class="card"><div class="v">${expediente.resumen.incidentesResueltos}</div><div class="l">Incidentes resueltos</div></div>
  </div>

  <h2>Logros verificables</h2>
  ${logrosHtml || '<p style="color:#64748b">Sin logros registrados aún.</p>'}

  <div class="footer">
    Documento generado por el <span class="sello-institucional">Simulador Laboral institucional</span> — validación académica simulada.
    <br>Este expediente refleja logros con datos reales de la plataforma; no constituye experiencia laboral formal.
  </div>
</div>
</body>
</html>`;
}

// ─── Entrevista entrenada (R-08 Fase 2) ───────────────────────

// POST /api/sim/interview/start — genera preguntas sobre logros reales
simEngineRouter.post('/interview/start', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  try {
    const specialty = (req.body?.specialty as string) === 'data_engineering' ? 'data_engineering' : 'accounting';
    const session = await startInterview(userId, specialty);
    if (session.preguntas.length === 0) {
      res.status(400).json({ error: 'Aún no tienes logros suficientes para ser entrevistado. Completa más tareas primero.' });
      return;
    }
    res.json(session);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sim/interview/submit — envía respuestas y recibe calificación
simEngineRouter.post('/interview/submit', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  try {
    const { session, respuestas } = req.body as { session: any; respuestas: InterviewAnswer[] };
    if (!session || !Array.isArray(respuestas)) {
      res.status(400).json({ error: 'Faltan session y respuestas' });
      return;
    }
    const result = completarEntrevista(session, respuestas);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Práctica a la medida (R-08 Fase 3) ───────────────────────

// GET /api/sim/refuerzo — plan de micro-ejercicios para habilidades bajas
simEngineRouter.get('/refuerzo', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  try {
    const specialty = (req.query.specialty as string) === 'data_engineering' ? 'data_engineering' : 'accounting';
    const plan = await buildPlanRefuerzo(userId, specialty);
    res.json(plan);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

simEngineRouter.get('/my-profile', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

  // Intentar leer desde Supabase sin joins (más seguro)
  if (isSupabaseReady()) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();
      
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('fullName,full_name,specialty')
        .eq('id', userId)
        .maybeSingle();

      const specialty = profile?.specialty === 'data_engineering' ? 'data_engineering' : 'accounting';

      res.json({
        userId,
        fullName: profile?.fullName || profile?.full_name || req.user?.email || 'Usuario',
        subscriptionStatus: data ? 'active' : 'none',
        onboardingCompleted: !!data,
        specialty,
        assignedJob: specialty === 'data_engineering'
          ? { id: 'b0000000-0000-0000-0000-000000000003', title: 'Analista de Datos', description: 'SQL, Python, profiling, calidad de datos — desbloquea Ingeniería o Ciencia con tu práctica', difficulty: 1 }
          : { id: 'b0000000-0000-0000-0000-000000000001', title: 'Auxiliar Contable', description: 'Apoyo en registro de operaciones diarias, facturación y conciliación bancaria.', difficulty: 1 },
      });
      return;
    } catch (e) {
      // Fallback a memory mode si hay error
    }
  }

  // Memory mode
  const onboardingData = MemoryDatabase.onboardingData?.get(userId);
  if (onboardingData) {
    res.json(onboardingData);
    return;
  }

  res.json({
    userId,
    fullName: req.user?.email || 'Usuario',
    subscriptionStatus: 'none',
    onboardingCompleted: false,
  });
});

simEngineRouter.post('/onboarding', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

  const { simulationProfile, experienceLevel, assignedJobId, assignedCompanyId, specialty } = req.body;

  if (isSupabaseReady()) {
    // En Supabase: guardamos el estado del onboarding via user_subscriptions
    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: null,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).select('id').maybeSingle();

    // Persistir la especialidad elegida en el perfil del alumno
    const finalSpecialty = specialty === 'data_engineering' ? 'data_engineering' : 'accounting';
    await supabaseAdmin.from('profiles').upsert(
      { id: userId, specialty: finalSpecialty },
      { onConflict: 'id' }
    ).select('id').maybeSingle();

    // Ignorar error si ya existe suscripción
    res.json({ success: true });
    return;
  }

  if (!MemoryDatabase.onboardingData) {
    MemoryDatabase.onboardingData = new Map();
  }
  MemoryDatabase.onboardingData.set(userId, {
    userId,
    fullName: req.user?.email || 'Usuario',
    subscriptionStatus: 'active',
    onboardingCompleted: true,
    simulationProfile: simulationProfile || 'pyme',
    experienceLevel: experienceLevel || 'beginner',
    specialty: specialty === 'data_engineering' ? 'data_engineering' : 'accounting',
    assignedJob: MemoryDatabase.simJobs.find(j => j.id === assignedJobId) || MemoryDatabase.simJobs[0],
    assignedCompany: MemoryDatabase.simCompanies.find(c => c.id === assignedCompanyId) || MemoryDatabase.simCompanies[0],
  });

  res.json({ success: true });
});

simEngineRouter.post('/subscribe', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

  if (isSupabaseReady()) {
    // Verificar si ya tiene suscripción activa
    const { data: existing } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      res.json({ status: 'active' });
      return;
    }

    // Crear suscripción trial
    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: null,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ status: 'active' });
    return;
  }

  // Memory mode
  const onboardingData = MemoryDatabase.onboardingData?.get(userId);
  if (onboardingData) {
    onboardingData.subscriptionStatus = 'active';
    MemoryDatabase.onboardingData?.set(userId, onboardingData);
  }

  res.json({ status: 'active' });
});

function formatSimProfile(data: any) {
  if (!data) return null;
  return {
    userId: data.id,
    fullName: data.full_name || data.fullName,
    subscriptionStatus: data.subscription_status || (data.onboarding_completed ? 'trial' : 'none'),
    onboardingCompleted: !!data.onboarding_completed,
    simulationProfile: data.simulation_profile || '',
    experienceLevel: data.experience_level || '',
    assignedJob: data.sim_jobs || null,
    assignedCompany: data.sim_companies || null,
  };
}

simEngineRouter.get('/documents/:type', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { type } = req.params;
  const validTypes = ['invoice', 'bank_statement', 'payment_receipt', 'trial_balance', 'payroll'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: 'Tipo de documento no válido. Usa: ' + validTypes.join(', ') });
    return;
  }
  const clientIdx = req.query.clientIdx ? parseInt(req.query.clientIdx as string) : undefined;
  const format = req.query.format as string || 'html';
  const doc = generateDocument(type, clientIdx);

  if (format === 'json') {
    res.json({ type, ...doc.data });
    return;
  }
  res.type('html').send(doc.html);
});
