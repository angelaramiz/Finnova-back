// ─── Revisor de moldes, Fase 2 (Capa 2 por reglas, sin LLM) ───
// POST /api/moldes/:id/review — corre Capa 1 (veto duro) + Capa 2
// (score advisory) sobre el molde que envia el frontend (dueno del
// registry) y devuelve el veredicto.
// POST /api/moldes/:id/override — override humano: registra quien,
// cuando y por que (memoria + log). No falsifica el veredicto:
// la primera publicacion siempre es manual.
import { Router, Response } from 'express';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { reviewMolde, registerOverride } from '../services/moldeReview';

export const moldesRouter = Router();

// POST /api/moldes/:id/review — {molde} -> {capa1, capa2, veredicto}
moldesRouter.post('/:id/review', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { molde } = req.body || {};
  if (!molde || typeof molde !== 'object') {
    res.status(400).json({ error: 'molde requerido en el body (el frontend es dueno del registry)' });
    return;
  }
  try {
    res.json(reviewMolde(req.params.id, molde));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'error interno';
    res.status(500).json({ error: msg });
  }
});

// POST /api/moldes/:id/override — {motivo} -> registro quien/cuando/porque
moldesRouter.post('/:id/override', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { motivo } = req.body || {};
  if (!motivo || !String(motivo).trim()) {
    res.status(400).json({ error: 'motivo requerido (override humano auditado)' });
    return;
  }
  try {
    const por = req.user?.email || req.user?.id || 'staff';
    res.json({ override: registerOverride(req.params.id, String(motivo), por) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'error interno';
    res.status(400).json({ error: msg });
  }
});
