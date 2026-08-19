// ─── Etapa 1 — Diagnóstico de vacante (R-10 v2) ───────────────
import { Router, Response } from 'express';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { analyzeVacancyForUser, submitStage1, reevaluateStage1, saveDensity, listAssessments } from '../services/stage1Service';
import { buildIntensivePlan } from '../services/intensivePlanner';
import { buildCareerKit } from '../services/careerCenter';
import { computeDensity } from '../services/experienceDensity';

export const stage1Router = Router();

// GET /api/stage1/assessments — diagnósticos previos (para reevaluar)
stage1Router.get('/assessments', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  try {
    const list = await listAssessments(userId);
    res.json({ assessments: list });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

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

// POST /api/stage1/intensive — plan intensivo (Modo B) a partir de gaps
stage1Router.post('/intensive', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { assessmentId, gaps } = req.body || {};
  if (!assessmentId || !Array.isArray(gaps)) {
    res.status(400).json({ error: 'assessmentId y gaps requeridos' });
    return;
  }
  try {
    const plan = buildIntensivePlan(userId, assessmentId, gaps);
    res.json(plan);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/stage1/kit — kit de postulación (Modo A)
stage1Router.post('/kit', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { vacancyTitle, skillsTarget, match_pct, specialty } = req.body || {};
  if (!vacancyTitle || !Array.isArray(skillsTarget)) {
    res.status(400).json({ error: 'vacancyTitle y skillsTarget requeridos' });
    return;
  }
  try {
    const kit = await buildCareerKit(userId, vacancyTitle, skillsTarget, Number(match_pct) || 0, specialty);
    res.json(kit);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/stage1/density — densidad de experiencia (Etapa 3)
stage1Router.post('/density', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { casosResueltos, complejidad, variedad, incidentes, resultados } = req.body || {};
  try {
    const result = computeDensity({
      casosResueltos: Number(casosResueltos) || 0,
      complejidad: Number(complejidad) || 0,
      variedad: Number(variedad) || 0,
      incidentes: Number(incidentes) || 0,
      resultados: Number(resultados) || 0,
    });
    // Persiste la densidad en el perfil (Etapa 3 como evidencia transversal).
    if (userId) await saveDensity(userId, result.density_pct);
    res.json({ ...result, persisted: !!userId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});