/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { MemoryDatabase } from '../lib/memoryDb';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

export const pipelineRouter = Router();

const PipelineReviewPatchSchema = z.object({
  status: z.enum(['pending_ingredients', 'tts_generated', 'video_composited', 'awaiting_approval', 'approved', 'rejected']),
  reviewerNotes: z.string().optional(),
});

/**
 * GET /api/pipeline/reviews
 * Return all pipeline logs for instructors monitoring clip rendering workflows
 */
pipelineRouter.get('/reviews', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  // Instructors/Admins only
  const isAuthorized = req.user?.role === 'instructor' || req.user?.role === 'admin';
  if (!isAuthorized) {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or administrators.' });
     return;
  }

  res.status(200).json(MemoryDatabase.pipelineReviews);
});

/**
 * POST /api/pipeline/reviews/:id/patch
 * Allows editing or approving/rejecting a pending pipeline item
 */
pipelineRouter.post('/reviews/:id/patch', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  const isAuthorized = req.user?.role === 'instructor' || req.user?.role === 'admin';
  if (!isAuthorized) {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or administrators.' });
     return;
  }

  const { id } = req.params;
  const parseResult = PipelineReviewPatchSchema.safeParse(req.body);
  if (!parseResult.success) {
     res.status(400).json({ error: 'Bad Request', details: parseResult.error.format() });
     return;
  }

  const item = MemoryDatabase.pipelineReviews.find(pr => pr.id === id);
  if (!item) {
     res.status(404).json({ error: 'Not Found', message: 'Pipeline review track record not found.' });
     return;
  }

  const { status, reviewerNotes } = parseResult.data;

  item.status = status;
  if (reviewerNotes) {
    item.reviewerNotes = reviewerNotes;
  }
  item.updatedAt = new Date().toISOString();

  // If approved, verify corresponding Clip has its state toggled to 'approved' for student feed access
  if (status === 'approved' && item.clipId) {
    const clip = MemoryDatabase.clips.find(c => c.id === item.clipId);
    if (clip) {
      clip.status = 'approved';
      console.log(`[Pipeline Approved] Clip "${clip.title}" published automatically!`);
    }
  }

  res.status(200).json({
    message: 'Pipeline review updated.',
    data: item,
  });
});

/**
 * POST /api/pipeline/create-draft
 * Simulates triggering a full automated pipeline from a single text prompt
 */
pipelineRouter.post('/create-draft', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  const isAuthorized = req.user?.role === 'instructor' || req.user?.role === 'admin';
  if (!isAuthorized) {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors.' });
     return;
  }

  const { inputPrompt, voiceModel, videoPrompt, clipId } = req.body;

  if (!inputPrompt) {
     res.status(400).json({ error: 'Bad Request', message: 'Prompt input is mandatory.' });
     return;
  }

  const newPipelineItem = {
    id: `p-${Math.random().toString(36).substring(7)}`,
    clipId: clipId || 'f0000001-0000-0000-0000-000000000001',
    inputPrompt,
    draftAudioUrl: 'https://example.com/audio/draft_synth.mp3',
    voiceModelUsed: voiceModel || 'elevenlabs-charon-finance-v2',
    videoGenerationPrompt: videoPrompt || 'A gorgeous dark visualization of market charts, high constant movement, vertical 9:16 grid.',
    renderedVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    pipelineId: `n8n-exec-${Math.random().toString(36).substring(5)}`,
    status: 'awaiting_approval' as const,
    reviewerNotes: 'Generated via custom teacher workspace trigger. Ready for audit.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  MemoryDatabase.pipelineReviews.push(newPipelineItem);
  res.status(201).json(newPipelineItem);
});
