// ─── Etapa 1 — Diagnóstico de vacante (R-10 v2) ───────────────
import { Router, Response } from 'express';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { analyzeVacancyForUser, submitStage1, reevaluateStage1 } from '../services/stage1Service';

export const stage1Router = Router();

// POST /api/stage1/analyze — pegar vacante → skills + prueba + routing preliminar
stage1Router.post('/analyze', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { vacancyText, specialty } = req.body || {};
  if (!vacancyText || String(vacancyText).trim().length < 20) {
    res.status(400).json({ error: 'Pega el texto completo de la vacante (mín. 20 caracteres).' });
    return;
  }
  try {
    const result = await analyzeVacancyForUser(userId, String(vacancyText), specialty);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/stage1/submit — respuestas de la prueba → match final + routing
stage1Router.post('/submit', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { assessmentId, answers, specialty } = req.body || {};
  if (!assessmentId || !answers) {
    res.status(400).json({ error: 'assessmentId y answers requeridos' });
    return;
  }
  try {
    const result = await submitStage1(userId, assessmentId, answers, specialty);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/stage1/reevaluate — misma vacante tras completar bloques del plan
stage1Router.post('/reevaluate', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { assessmentId, specialty } = req.body || {};
  if (!assessmentId) {
    res.status(400).json({ error: 'assessmentId requerido' });
    return;
  }
  try {
    const result = await reevaluateStage1(userId, assessmentId, specialty);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});