// ─── Staff — seguimiento de alumnos del simulador ──────────────
// Lista a los alumnos con su progreso agregado y el estado de su mundo
// simulado. En producción consulta Supabase; en local (mocks) devuelve
// datos de demostración para que la UI sea verificable.

import { Router, Response } from 'express';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';

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
}

export function buildDemoStudents(): StudentRow[] {
  return [
    { id: 'demo-1', name: 'Ana García', email: 'ana@demo.mx', specialty: 'data_engineering', completed: 8, total: 12, scorePct: 82, trapsDetected: 2, world: { pipeline: 'recovered', sla: 'met' } },
    { id: 'demo-2', name: 'Carlos López', email: 'carlos@demo.mx', specialty: 'data_engineering', completed: 4, total: 12, scorePct: 61, trapsDetected: 1, world: { pipeline: 'failed', sla: 'breached' } },
    { id: 'demo-3', name: 'María Fernández', email: 'maria@demo.mx', specialty: 'accounting', completed: 11, total: 12, scorePct: 90, trapsDetected: 3, world: { pipeline: 'recovered', sla: 'met' } },
  ];
}

staffRouter.get('/students', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isSupabaseReady()) {
      res.json({ source: 'demo', students: buildDemoStudents() });
      return;
    }

    // Perfiles de alumnos
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id,email,full_name,role,points_earned,specialty')
      .eq('role', 'student');
    if (pErr) throw pErr;

    // Mundo simulado por usuario
    const { data: worlds, error: wErr } = await supabaseAdmin
      .from('sim_world')
      .select('user_id,state');
    if (wErr) throw wErr;
    const worldByUser = new Map((worlds || []).map((w: any) => [w.user_id, w.state]));

    // Progreso agregado (sim_progress: completaciones por usuario/especialidad)
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
      };
    });

    res.json({ source: 'supabase', students });
  } catch (e: any) {
    // Degradación segura: si falla Supabase, mostramos demo
    res.json({ source: 'demo', students: buildDemoStudents(), error: e.message });
  }
});
