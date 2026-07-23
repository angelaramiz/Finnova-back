/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { MemoryDatabase } from '../lib/memoryDb';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { getAIProvider } from '../providers/ai';
import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';
import { z } from 'zod';

export const exercisesRouter = Router();

const SubmissionBodySchema = z.object({
  userAnswer: z.string().min(1),
});

function mapExercise(dbEx: any) {
  if (!dbEx) return null;
  return {
    id: dbEx.id,
    clipId: dbEx.clip_id,
    title: dbEx.title,
    exerciseType: dbEx.exercise_type,
    question: dbEx.question,
    prompt: dbEx.prompt,
    correctAnswer: dbEx.correct_answer,
    rubrics: dbEx.rubrics,
    maxPoints: dbEx.max_points
  };
}

function mapExerciseAttempt(dbAttempt: any) {
  if (!dbAttempt) return null;
  return {
    id: dbAttempt.id,
    userId: dbAttempt.user_id,
    exerciseId: dbAttempt.exercise_id,
    userAnswer: dbAttempt.user_answer,
    isPassed: dbAttempt.is_passed,
    scorePoints: dbAttempt.score_points,
    evaluationType: dbAttempt.evaluation_type,
    aiFeedback: dbAttempt.ai_feedback,
    attemptedAt: dbAttempt.attempted_at
  };
}

/**
 * POST /api/exercises/:exerciseId/submit
 * Process hybrid submission of a practical accounting/financial task
 */
exercisesRouter.post('/:exerciseId/submit', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || '22222222-2222-2222-2222-222222222222';
  const { exerciseId } = req.params;

  const parseResult = SubmissionBodySchema.safeParse(req.body);
  if (!parseResult.success) {
     res.status(400).json({ error: 'Bad Request', details: parseResult.error.format() });
     return;
  }

  const { userAnswer } = parseResult.data;
  const isSupabaseConfigured = isSupabaseReady();

  let exercise: any;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .maybeSingle();

      if (error || !data) {
        res.status(404).json({ error: 'Not Found', message: 'Financial exercise of this reference ID not found.' });
        return;
      }
      exercise = mapExercise(data);
    } catch (err: any) {
      res.status(500).json({ error: 'Database Error', message: err.message });
      return;
    }
  } else {
    exercise = MemoryDatabase.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) {
      res.status(404).json({ error: 'Not Found', message: 'Financial exercise of this reference ID not found.' });
      return;
    }
  }

  try {
    const aiProvider = getAIProvider();
    const graderOutput = await aiProvider.evaluateSubmission(exercise, userAnswer);

    if (isSupabaseConfigured) {
      const { data: attempt, error: insertErr } = await supabaseAdmin
        .from('exercise_attempts')
        .insert({
          user_id: userId,
          exercise_id: exerciseId,
          user_answer: userAnswer,
          is_passed: graderOutput.passed,
          score_points: graderOutput.score,
          evaluation_type: graderOutput.evaluationType,
          ai_feedback: graderOutput.feedback,
          attempted_at: new Date().toISOString()
        })
        .select()
        .maybeSingle();

      if (insertErr || !attempt) {
        res.status(500).json({ error: 'Database Error', message: insertErr?.message || 'Failed to insert attempt.' });
        return;
      }

      if (attempt.is_passed) {
        const { data: profile, error: profErr } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (profile && !profErr) {
          const pointsAdded = 50 + (attempt.score_points * 2);
          const newPoints = (profile.pointsEarned || 0) + pointsAdded;
          await supabaseAdmin
            .from('profiles')
            .update({ pointsEarned: newPoints })
            .eq('id', userId);
          console.log(`[Gamified Points] Student "${profile.fullName}" earned ${pointsAdded}XP for passing exercise "${exercise.title}". Total: ${newPoints}XP`);
        }
      }

      res.status(200).json({
        success: true,
        data: mapExerciseAttempt(attempt),
      });
      return;
    }

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

    if (attempt.isPassed) {
      const profile = MemoryDatabase.profiles.find(p => p.id === userId);
      if (profile) {
        const pointsAdded = 50 + (attempt.scorePoints * 2);
        profile.pointsEarned += pointsAdded;
        console.log(`[Gamified Points] Student "${profile.fullName}" earned ${pointsAdded}XP for passing exercise "${exercise.title}". Total: ${profile.pointsEarned}XP`);
      }
    }

    res.status(200).json({
      success: true,
      data: attempt,
    });
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
exercisesRouter.get('/:exerciseId/attempts', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || '22222222-2222-2222-2222-222222222222';
  const { exerciseId } = req.params;
  const isSupabaseConfigured = isSupabaseReady();

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from('exercise_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .order('attempted_at', { ascending: false });

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      res.status(200).json((data || []).map(mapExerciseAttempt));
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const list = MemoryDatabase.exerciseAttempts.filter(
    ea => ea.userId === userId && ea.exerciseId === exerciseId
  ).sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());

  res.status(200).json(list);
});
