/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { getVideoProvider } from '../providers/video';
import { getTTSProvider } from '../providers/tts';

// Webhook validation schema
const WebhookPayloadSchema = z.object({
  pipelineId: z.string(),
  action: z.enum(['create_clip', 'update_status', 'trigger_review_comp']),
  payload: z.object({
    courseId: z.string().optional(),
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    rawUrl: z.string().url().optional(),
    voiceName: z.string().optional(),
    status: z.enum(['draft', 'reviewing', 'approved', 'rejected']).optional(),
    notes: z.string().optional(),
  }),
});

export const webhookRouter = Router();

// Idempotency log for production workflows
const processedPipelines = new Set<string>();

/**
 * Validates n8n HMAC-SHA256 Signed headers securely
 */
function verifyHmacSignature(req: Request, res: Response, next: () => void): void {
  const secret = process.env.N8N_WEBHOOK_SECRET || 'your_shared_hmac_secret_sha256';
  const headerSignature = req.headers['x-n8n-signature'] as string;

  const rawMockFlag = process.env.ENABLE_DOCKER_MOCKS || '';
  const isMockAllowed = rawMockFlag.trim().toLowerCase().replace(/['"]/g, '') !== 'false' && process.env.REQUIRE_REAL_AUTH !== 'true';

  if (!headerSignature) {
    if (isMockAllowed) {
      console.warn('[Webhook Warning] Received payload with missing HMAC signature. Enforcing simulation bypass.');
      return next(); // Pass through with simulation logging in dev sandbox
    }
    res.status(401).json({
      error: 'Unauthorised',
      message: 'Missing x-n8n-signature header. Cryptographic signature required.',
    });
    return;
  }

  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const calculatedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    // Cryptographically secure signature comparison using hex encoding
    const sigBuffer = Buffer.from(headerSignature, 'hex');
    const calcBuffer = Buffer.from(calculatedSignature, 'hex');

    if (sigBuffer.length !== calcBuffer.length || !crypto.timingSafeEqual(sigBuffer, calcBuffer)) {
       res.status(401).json({
        error: 'Unauthorised',
        message: 'Invalid cryptographic signature match.',
      });
       return;
    }

    next();
  } catch (err: any) {
    console.error('Signature verification error during webhook ingestion:', err);
     res.status(500).json({ error: 'Signature failure processing' });
     return;
  }
}

// Attach HMAC validator middleware to pipeline endpoint
webhookRouter.post('/n8n', verifyHmacSignature, async (req: Request, res: Response): Promise<void> => {
  const parseResult = WebhookPayloadSchema.safeParse(req.body);
  if (!parseResult.success) {
     res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid payload structure.',
      details: parseResult.error.format(),
    });
     return;
  }

  const { pipelineId, action, payload } = parseResult.data;

  // Idempotency check. Prevents reprocessing identical task transactions
  if (processedPipelines.has(pipelineId)) {
    console.log(`[Webhook Idempotency] Skipping duplicated pipeline call: ${pipelineId}`);
     res.status(200).json({
      success: true,
      message: 'Already processed.',
      pipelineId,
    });
     return;
  }

  console.log(`[Webhook Ingested] Processing pipeline task: ${pipelineId} | Action: ${action}`);

  try {
    const videoProvider = getVideoProvider();
    const ttsProvider = getTTSProvider();

    // Emulates database operations. These will persist into global mocks or database.
    // In production, these statements call Prisma/Drizzle on PostgreSQL.
    if (action === 'create_clip') {
      const clipTitle = payload.title || 'Clip sin título';
      const rawUrl = payload.rawUrl || 'https://vjs.zencdn.net/v/oceans.mp4';
      
      console.log(`[Pipeline Stage 1] Generating Speech TTS for: "${clipTitle}"`);
      const ttsMeta = await ttsProvider.synthesizeSpeech(
        `Concepto clave de finanzas: ${clipTitle}. ${payload.description || ''}`,
        payload.voiceName || 'Charon'
      );

      console.log(`[Pipeline Stage 2] Processing Video Assets on Cloudflare Stream copies.`);
      const videoMeta = await videoProvider.registerClip(clipTitle, rawUrl);

      // Create simulation response mimicking an DB entry insertion
      const mockResult = {
        id: crypto.randomUUID(),
        pipelineId,
        courseId: payload.courseId || 'c0000000-0000-0000-0000-000000000001',
        title: clipTitle,
        description: payload.description || '',
        videoProviderId: videoMeta.providerId,
        videoUrl: videoMeta.playbackUrl,
        ttsAudioUrl: ttsMeta.audioUrl,
        duration: videoMeta.durationSeconds,
        status: 'reviewing',
        notes: `Generado automáticamente por webhook. TTS de ElevenLabs/Gemini listo.`,
      };

      // In real backend, this updates db record: `await db.insert(clips).values(...)`

      processedPipelines.add(pipelineId);

       res.status(201).json({
        success: true,
        message: 'Clip created and pipeline review phase initialized.',
        pipelineId,
        data: mockResult,
      });
       return;
    }

    if (action === 'update_status') {
      // Updates an existing clip record approval status
      console.log(`[Pipeline Audit] Updating clip status to "${payload.status}"`);
      
      processedPipelines.add(pipelineId);
      
       res.status(200).json({
        success: true,
        message: 'Status updated successfully.',
        pipelineId,
        data: {
          pipelineId,
          status: payload.status,
          notes: payload.notes || 'No review comments.',
        }
      });
       return;
    }

    res.status(405).json({
      error: 'Not Allowed',
      message: `Action ${action} is recognized but not supported.`,
    });
  } catch (err: any) {
    console.error('Fatal failure processing n8n webhook routing:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
    });
  }
});
