// ─── Agente-automatizador de rutas (R-12) ─────────────────────
// Endpoints del compilador de rutas: pega una vacante real → obtén la ruta
// SIMULAB v2 completa (Etapas 1-3) + los motores faltantes por construir.
import { Router, Response } from 'express';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { compileRoute } from '../services/roadmapCompiler';
import { listCapabilities, pendingEngines, ENGINE_BACKLOG } from '../services/engineCapabilities';
import { validateSimulabV2 } from '../services/simulabFormat';

export const automatorRouter = Router();

// GET /api/automator/capabilities — catálogo de capacidades de motor (existentes/faltantes)
automatorRouter.get('/capabilities', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  res.json({ capabilities: listCapabilities(), pending_engines: pendingEngines() });
});

// GET /api/automator/pending-engines — motores que el sistema debe construir (backlog)
automatorRouter.get('/pending-engines', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  res.json({ pending_engines: pendingEngines() });
});

// POST /api/automator/compile — pegar vacante → ruta SIMULAB v2 + Etapas 1-3 + motores faltantes
automatorRouter.post('/compile', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  const { vacancyText, specialty } = req.body || {};
  if (!vacancyText || String(vacancyText).trim().length < 20) {
    res.status(400).json({ error: 'Pega el texto completo de la vacante (mín. 20 caracteres).' });
    return;
  }
  try {
    const result = await compileRoute(String(vacancyText), userId, specialty);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/automator/validate — validar un documento SIMULAB v2 (sin ejecutar)
automatorRouter.post('/validate', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { doc } = req.body || {};
  if (!doc) { res.status(400).json({ error: 'doc SIMULAB v2 requerido' }); return; }
  const result = validateSimulabV2(doc);
  res.json(result);
});

// POST /api/automator/backlog/clear — (admin) limpiar backlog de motores pendientes
automatorRouter.post('/backlog/clear', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  if (req.user?.role !== 'admin') { res.status(403).json({ error: 'Solo admin' }); return; }
  ENGINE_BACKLOG.length = 0;
  res.json({ ok: true, pending_engines: pendingEngines() });
});

// POST /api/automator/backlog/complete — (admin) marcar un motor como construido
automatorRouter.post('/backlog/complete', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
  if (req.user?.role !== 'admin') { res.status(403).json({ error: 'Solo admin' }); return; }
  const { id } = req.body || {};
  const idx = ENGINE_BACKLOG.findIndex(b => b.id === id);
  if (idx === -1) { res.status(404).json({ error: `Motor "${id}" no está en backlog` }); return; }
  ENGINE_BACKLOG.splice(idx, 1);
  res.json({ ok: true, pending_engines: pendingEngines() });
});