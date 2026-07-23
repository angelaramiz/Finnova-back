/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { MemoryDatabase } from '../lib/memoryDb';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';
import { z } from 'zod';

export const pipelineRouter = Router();

const PipelineReviewPatchSchema = z.object({
  status: z.enum(['pending_ingredients', 'tts_generated', 'video_composited', 'awaiting_approval', 'approved', 'rejected']),
  reviewerNotes: z.string().optional(),
});

function mapPipelineReview(dbPr: any) {
  if (!dbPr) return null;
  return {
    id: dbPr.id,
    clipId: dbPr.clip_id,
    inputPrompt: dbPr.input_prompt,
    draftAudioUrl: dbPr.draft_audio_url,
    voiceModelUsed: dbPr.voice_model_used,
    videoGenerationPrompt: dbPr.video_generation_prompt,
    renderedVideoUrl: dbPr.rendered_video_url,
    pipelineId: dbPr.pipeline_id,
    status: dbPr.status,
    reviewerNotes: dbPr.reviewer_notes,
    createdAt: dbPr.created_at,
    updatedAt: dbPr.updated_at
  };
}

/**
 * GET /api/pipeline/reviews
 * Return all pipeline logs for instructors monitoring clip rendering workflows
 */
pipelineRouter.get('/reviews', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const isAuthorized = req.user?.role === 'instructor' || req.user?.role === 'admin';
  if (!isAuthorized) {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or administrators.' });
     return;
  }

  const isSupabaseConfigured = isSupabaseReady();

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from('pipeline_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      res.status(200).json((data || []).map(mapPipelineReview));
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  res.status(200).json(MemoryDatabase.pipelineReviews);
});

/**
 * POST /api/pipeline/reviews/:id/patch
 * Allows editing or approving/rejecting a pending pipeline item
 */
pipelineRouter.post('/reviews/:id/patch', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
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

  const { status, reviewerNotes } = parseResult.data;
  const isSupabaseConfigured = isSupabaseReady();

  if (isSupabaseConfigured) {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };
      if (reviewerNotes !== undefined) {
        updateData.reviewer_notes = reviewerNotes;
      }

      const { data: item, error } = await supabaseAdmin
        .from('pipeline_reviews')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error || !item) {
        res.status(404).json({ error: 'Not Found', message: 'Pipeline review track record not found.' });
        return;
      }

      // If approved, verify corresponding Clip has its state toggled to 'approved'
      if (status === 'approved' && item.clip_id) {
        await supabaseAdmin
          .from('clips')
          .update({ status: 'approved' })
          .eq('id', item.clip_id);
        console.log(`[Pipeline Approved] Clip "${item.clip_id}" published automatically!`);
      }

      res.status(200).json({
        message: 'Pipeline review updated.',
        data: mapPipelineReview(item),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const item = MemoryDatabase.pipelineReviews.find(pr => pr.id === id);
  if (!item) {
     res.status(404).json({ error: 'Not Found', message: 'Pipeline review track record not found.' });
     return;
  }

  item.status = status;
  if (reviewerNotes) {
    item.reviewerNotes = reviewerNotes;
  }
  item.updatedAt = new Date().toISOString();

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
pipelineRouter.post('/create-draft', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
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

  const isSupabaseConfigured = isSupabaseReady();

  if (isSupabaseConfigured) {
    try {
      const { data: newPipelineItem, error } = await supabaseAdmin
        .from('pipeline_reviews')
        .insert({
          clip_id: clipId || null,
          input_prompt: inputPrompt,
          draft_audio_url: 'https://example.com/audio/draft_synth.mp3',
          voice_model_used: voiceModel || 'elevenlabs-charon-finance-v2',
          video_generation_prompt: videoPrompt || 'A gorgeous dark visualization of market charts, high constant movement, vertical 9:16 grid.',
          rendered_video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
          pipeline_id: `n8n-exec-${Math.random().toString(36).substring(5)}`,
          status: 'awaiting_approval',
          reviewer_notes: 'Generated via custom teacher workspace trigger. Ready for audit.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .maybeSingle();

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      res.status(201).json(mapPipelineReview(newPipelineItem));
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
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
