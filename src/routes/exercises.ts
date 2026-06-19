/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { MemoryDatabase } from '../lib/memoryDb';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { getAIProvider } from '../providers/ai';
import { z } from 'zod';

export const exercisesRouter = Router();

// Validate submission request
const SubmissionBodySchema = z.object({
  userAnswer: z.string().min(1),
});

/**
 * POST /api/exercises/:exerciseId/submit
 * Process hybrid submission of a practical accounting/financial task
 */
exercisesRouter.post('/:exerciseId/submit', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || '22222222-2222-2222-2222-222222222222';
  const { exerciseId } = req.params;

  const parseResult = SubmissionBodySchema.safeParse(req.body);
  if (!parseResult.success) {
     res.status(400).json({ error: 'Bad Request', details: parseResult.error.format() });
     return;
  }

  const { userAnswer } = parseResult.data;

  // Retrieve matching exercise definition
  const exercise = MemoryDatabase.exercises.find(ex => ex.id === exerciseId);
  if (!exercise) {
     res.status(404).json({ error: 'Not Found', message: 'Financial exercise of this reference ID not found.' });
     return;
  }

  try {
    // Retrieve registered AI grading agent
    const aiProvider = getAIProvider();
    
    // Evaluate via Hybrid module
    const graderOutput = await aiProvider.evaluateSubmission(exercise, userAnswer);

    // Persist attempt row
    const attempt = {
      id: `ea-${Math.random().toString(36).substring(7)}`,
      userId,
      exerciseId,
      userAnswer,
      isPassed: graderOutput.passed,
      scorePoints: graderOutput.score,
      evaluationType: graderOutput.evaluationType,
      aiFeedback: graderOutput.feedback,
      attemptedAt: new Date().toISOString(),
    };

    MemoryDatabase.exerciseAttempts.push(attempt);

    // If passed, award gamified points equivalent to total earned points in evaluation
    if (attempt.isPassed) {
      const profile = MemoryDatabase.profiles.find(p => p.id === userId);
      if (profile) {
        // Give 50 base points + score points multiplier
        const pointsAdded = 50 + (attempt.scorePoints * 2);
        profile.pointsEarned += pointsAdded;
        console.log(`[Gamified Points] Student "${profile.fullName}" earned ${pointsAdded}XP for passing exercise "${exercise.title}". Total: ${profile.pointsEarned}XP`);
      }
    }

     res.status(200).json({
      success: true,
      data: attempt,
    });
     return;
  } catch (err: any) {
    console.error('Fatal error during evaluation submission:', err);
    res.status(500).json({
      error: 'Evaluation Error',
      message: err.message || 'Error occurred grading submission.',
    });
  }
});

/**
 * GET /api/exercises/:exerciseId/attempts
 * List user past attempts to track historical scores
 */
exercisesRouter.get('/:exerciseId/attempts', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user?.id || '22222222-2222-2222-2222-222222222222';
  const { exerciseId } = req.params;

  const list = MemoryDatabase.exerciseAttempts.filter(
    ea => ea.userId === userId && ea.exerciseId === exerciseId
  ).sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());

  res.status(200).json(list);
});
