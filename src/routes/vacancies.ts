// ─── Vacancies — Etapa 2 (R-10 v2) ────────────────────────────
import { Router, Response } from 'express';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { trackVacancy, setVacancyStatus, listVacancies, type VacancyStatus } from '../services/vacancyTracker';

export const vacanciesRouter = Router();

// GET /api/vacancies — listar vacantes en seguimiento
vacanciesRouter.get('/', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  try {
    const data = await listVacancies(userId);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/vacancies/track — registrar vacante (valida límite free)
vacanciesRouter.post('/track', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const body = req.body || {};
  if (!body.vacancy_id) {
    res.status(400).json({ error: 'vacancy_id requerido' });
    return;
  }
  try {
    const result = await trackVacancy(userId, body);
    if (!result.ok) {
      res.status(result.code).json({ error: result.message });
      return;
    }
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/vacancies/:id/status — cambiar estado (diagnostico→…→cerrada)
vacanciesRouter.post('/:id/status', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { id } = req.params;
  const status = req.body?.status as VacancyStatus;
  const valid: VacancyStatus[] = ['diagnostico', 'preparacion', 'postulacion', 'entrevista', 'cerrada'];
  if (!valid.includes(status)) {
    res.status(400).json({ error: 'Estado inválido' });
    return;
  }
  try {
    const row = await setVacancyStatus(userId, id, status);
    if (!row) { res.status(404).json({ error: 'Vacante no encontrada' }); return; }
    res.json({ ok: true, vacancy: row });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});