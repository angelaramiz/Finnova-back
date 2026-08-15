// ─── Staff — Centro de Control del simulador ──────────────────
// Permite al staff administrar a los alumnos: listarlos con su
// progreso agregado, ver el detalle de cada uno (progreso, mundo
// simulado), y ejecutar acciones de administración (reset del mundo,
// reset de progreso, cambiar especialidad). En producción consulta
// Supabase; en local (mocks) devuelve datos de demostración.

import { Router, Response } from 'express';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';
import { resetWorld, resetCareer } from '../services/simWorld';
import { resetProgress } from '../services/progressTracker';

export const staffRouter = Router();

export interface StudentRow {
  id: string;
  name: string;
  email?: string;
  specialty: string;
  completed: number;
  total: number;
  scorePct: number;
  trapsDetected: number;
  world: { pipeline: string; sla: string };
  career?: { node: string; branch: string | null; practicePct: number };
}

export function buildDemoStudents(): StudentRow[] {
  return [
    { id: 'demo-1', name: 'Ana García', email: 'ana@demo.mx', specialty: 'data_engineering', completed: 8, total: 12, scorePct: 82, trapsDetected: 2, world: { pipeline: 'recovered', sla: 'met' }, career: { node: 'data_engineering', branch: 'data_engineering', practicePct: 82 } },
    { id: 'demo-2', name: 'Carlos López', email: 'carlos@demo.mx', specialty: 'data_engineering', completed: 4, total: 12, scorePct: 61, trapsDetected: 1, world: { pipeline: 'failed', sla: 'breached' }, career: { node: 'analyst', branch: null, practicePct: 61 } },
    { id: 'demo-3', name: 'María Fernández', email: 'maria@demo.mx', specialty: 'accounting', completed: 11, total: 12, scorePct: 90, trapsDetected: 3, world: { pipeline: 'recovered', sla: 'met' } },
  ];
}

// ─── Helpers ───────────────────────────────────────────────────

async function fetchAllStudents(): Promise<{ source: string; students: StudentRow[] }> {
  if (!isSupabaseReady()) {
    return { source: 'demo', students: buildDemoStudents() };
  }

  try {
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id,email,full_name,role,points_earned,specialty')
      .eq('role', 'student');
    if (pErr) throw pErr;

    const { data: worlds, error: wErr } = await supabaseAdmin
      .from('sim_world')
      .select('user_id,state');
    if (wErr) throw wErr;
    const worldByUser = new Map((worlds || []).map((w: any) => [w.user_id, w.state]));

    let progressByUser = new Map<string, { completed: number; total: number; scoreSum: number; traps: number }>();
    try {
      const { data: progRows } = await supabaseAdmin
        .from('sim_progress')
        .select('user_id,data');
      (progRows || []).forEach((p: any) => {
        const list: any[] = p.data || [];
        const cur = progressByUser.get(p.user_id) || { completed: 0, total: 0, scoreSum: 0, traps: 0 };
        cur.completed += list.length;
        cur.total += list.length;
        list.forEach((t: any) => {
          cur.scoreSum += Number(t.score || 0);
          if (t.trapDetected) cur.traps += 1;
        });
        progressByUser.set(p.user_id, cur);
      });
    } catch { /* sim_progress con otro shape: progreso vacío */ }

    const students: StudentRow[] = (profiles || []).map((p: any) => {
      const prog = progressByUser.get(p.id);
      const w = worldByUser.get(p.id);
      return {
        id: p.id,
        name: p.full_name || p.email || 'Alumno',
        email: p.email,
        specialty: p.specialty || 'accounting',
        completed: prog?.completed ?? 0,
        total: prog?.total ?? 0,
        scorePct: prog && prog.total ? Math.round(prog.scoreSum / Math.max(prog.total, 1)) : 0,
        trapsDetected: prog?.traps ?? 0,
        world: {
          pipeline: w?.pipeline?.status || '—',
          sla: w?.slas?.mrtSla || '—',
        },
        career: w?.careerPath ? {
          node: w.careerPath.currentNode || 'analyst',
          branch: w.careerPath.chosenBranch || null,
          practicePct: w.careerPath.practicePct || 0,
        } : undefined,
      };
    });

    return { source: 'supabase', students };
  } catch (e: any) {
    console.error('staff.fetchAllStudents fallback a demo:', e.message);
    return { source: 'demo', students: buildDemoStudents() };
  }
}

function buildDemoStats(students: StudentRow[]) {
  const total = students.length;
  const bySpecialty = {
    accounting: students.filter(s => s.specialty !== 'data_engineering').length,
    data_engineering: students.filter(s => s.specialty === 'data_engineering').length,
  };
  const totalCompleted = students.reduce((s, x) => s + x.completed, 0);
  const totalTasks = students.reduce((s, x) => s + x.total, 0);
  const avgScore = total ? Math.round(students.reduce((s, x) => s + x.scorePct, 0) / total) : 0;
  const trapsDetected = students.reduce((s, x) => s + x.trapsDetected, 0);
  const pipelineOk = students.filter(s => s.world.pipeline === 'recovered' || s.world.pipeline === '—').length;
  const slasOk = students.filter(s => s.world.sla === 'met' || s.world.sla === '—').length;
  const deStudents = students.filter(s => s.specialty === 'data_engineering');
  const byBranch = {
    analyst: deStudents.filter(s => !s.career?.branch).length,
    engineering: deStudents.filter(s => s.career?.branch === 'data_engineering').length,
    science: deStudents.filter(s => s.career?.branch === 'data_science').length,
  };
  return { total, bySpecialty, totalCompleted, totalTasks, avgScore, trapsDetected, pipelineOk, slasOk, byBranch };
}

// ─── GET /api/staff/stats ──────────────────────────────────────
// KPIs agregadas de todos los alumnos del simulador.

staffRouter.get('/stats', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { source, students } = await fetchAllStudents();
    res.json({ source, stats: buildDemoStats(students), students: students.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/staff/students ───────────────────────────────────
// Lista los alumnos con progreso agregado y estado del mundo.

staffRouter.get('/students', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await fetchAllStudents();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/staff/students/:id ───────────────────────────────
// Detalle de un alumno: perfil, mundo simulado y progreso completo.

staffRouter.get('/students/:id', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    if (!isSupabaseReady()) {
      const demo = buildDemoStudents().find(s => s.id === id);
      if (!demo) { res.status(404).json({ error: 'Alumno no encontrado' }); return; }
      res.json({
        source: 'demo',
        student: {
          id: demo.id,
          name: demo.name,
          email: demo.email,
          specialty: demo.specialty,
          points: 0,
          world: { pipeline: { status: demo.world.pipeline }, slas: { mrtSla: demo.world.sla } },
          progress: [],
          recentCompletions: [],
          roleProgress: { completed: demo.completed, total: demo.total, avgScore: demo.scorePct, trapsDetected: demo.trapsDetected },
        },
      });
      return;
    }

    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id,email,full_name,role,points_earned,specialty')
      .eq('id', id)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!profile) { res.status(404).json({ error: 'Alumno no encontrado' }); return; }

    const { data: worldRow } = await supabaseAdmin.from('sim_world').select('state').eq('user_id', id).maybeSingle();
    const { data: progRows } = await supabaseAdmin.from('sim_progress').select('specialty,data').eq('user_id', id);
    const progressBySpec: Record<string, any[]> = {};
    (progRows || []).forEach((p: any) => { progressBySpec[p.specialty] = p.data || []; });

    const specialty = profile.specialty || 'accounting';
    const list = progressBySpec[specialty] || [];
    const completed = list.length;
    const total = Math.max(completed, 12);
    const avgScore = completed ? Math.round(list.reduce((s, t) => s + Number(t.score || 0), 0) / completed) : 0;
    const trapsDetected = list.filter((t: any) => t.trapDetected).length;

    res.json({
      source: 'supabase',
      student: {
        id: profile.id,
        name: profile.full_name || profile.email || 'Alumno',
        email: profile.email,
        specialty,
        points: profile.points_earned || 0,
        world: worldRow?.state || { pipeline: { status: '—' }, slas: { mrtSla: '—' } },
        progress: progressBySpec,
        recentCompletions: list.slice(-10).reverse(),
        roleProgress: { completed, total, avgScore, trapsDetected },
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/staff/students/:id/reset-career ───────────────
// Reinicia el árbol de rutas del alumno (permite re-elegir rama).

staffRouter.post('/students/:id/reset-career', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    if (!isSupabaseReady()) {
      res.json({ success: true, source: 'demo' });
      return;
    }
    const careerPath = await resetCareer(id);
    res.json({ success: true, careerPath });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/staff/students/:id/reset-world ─────────────────
// Reinicia el mundo simulado (pipeline del 05-jul, SLAs) del alumno.

staffRouter.post('/students/:id/reset-world', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    if (!isSupabaseReady()) {
      res.json({ success: true, source: 'demo' });
      return;
    }
    const world = await resetWorld(id);
    res.json({ success: true, world });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/staff/students/:id/reset-progress ──────────────
// Borra el progreso (sim_progress) de una especialidad del alumno.

staffRouter.post('/students/:id/reset-progress', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const specialty = (req.body?.specialty as string) || 'accounting';
  try {
    if (!isSupabaseReady()) {
      res.json({ success: true, source: 'demo' });
      return;
    }
    await resetProgress(id, specialty);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/staff/students/:id/specialty ───────────────────
// Cambia la especialidad activa del alumno.

staffRouter.post('/students/:id/specialty', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const specialty = req.body?.specialty as string;
  if (!['accounting', 'data_engineering'].includes(specialty)) {
    res.status(400).json({ error: 'Especialidad inválida. Usa accounting o data_engineering.' });
    return;
  }
  try {
    if (!isSupabaseReady()) {
      res.json({ success: true, source: 'demo' });
      return;
    }
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ specialty })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) { res.status(404).json({ error: 'Alumno no encontrado' }); return; }
    res.json({ success: true, profile: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
