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
import { generateMonthPlan, getTodayTasks, getWeekTasks, getMonthStats, CLIENT_PROFILES, SUPPLIER_PROFILES } from '../services/taskPlanner';

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
  const month = parseInt(req.params.month) || 6; // Julio por defecto
  const year = parseInt(req.params.year) || 2026;
  const plan = generateMonthPlan(month, year);
  res.json(plan);
});

simEngineRouter.get('/today-tasks/:month/:year/:week/:day', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const month = parseInt(req.params.month) || 6;
  const year = parseInt(req.params.year) || 2026;
  const week = parseInt(req.params.week) || 1;
  const day = parseInt(req.params.day) || 1;
  const tasks = getTodayTasks(month, year, week, day);
  res.json(tasks);
});

simEngineRouter.get('/week-tasks/:month/:year/:week', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const month = parseInt(req.params.month) || 6;
  const year = parseInt(req.params.year) || 2026;
  const week = parseInt(req.params.week) || 1;
  const tasks = getWeekTasks(month, year, week);
  res.json(tasks);
});

simEngineRouter.get('/month-stats/:month/:year', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const month = parseInt(req.params.month) || 6;
  const year = parseInt(req.params.year) || 2026;
  const stats = getMonthStats(month, year);
  res.json(stats);
});

// ─── ONBOARDING & SUBSCRIPTION ────────────────────────────────
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
        .select('fullName')
        .eq('id', userId)
        .maybeSingle();

      res.json({
        userId,
        fullName: profile?.fullName || req.user?.email || 'Usuario',
        subscriptionStatus: data ? 'active' : 'none',
        onboardingCompleted: !!data,
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

  const { simulationProfile, experienceLevel, assignedJobId, assignedCompanyId } = req.body;

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
