/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { MemoryDatabase } from '../lib/memoryDb';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

export const progressRouter = Router();

// Validate update body
const ProgressLogSchema = z.object({
  courseId: z.string(),
  clipId: z.string(),
  watchedSeconds: z.number().nonnegative(),
  isCompleted: z.boolean().optional(),
});

/**
 * GET /api/progress/:courseId
 * Retrieve user completion rate for a specific course
 */
progressRouter.get('/:courseId', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user?.id || '22222222-2222-2222-2222-222222222222';
  const { courseId } = req.params;

  // Find user progress rows
  const userRows = MemoryDatabase.userProgress.filter(
    p => p.userId === userId && p.courseId === courseId
  );

  const courseClips = MemoryDatabase.clips.filter(
    c => c.courseId === courseId && c.status === 'approved'
  );

  const totalClipsCount = courseClips.length;
  const completedClipsCount = userRows.filter(p => p.isCompleted).length;

  const percentCompleted = totalClipsCount > 0 
    ? Math.round((completedClipsCount / totalClipsCount) * 100)
    : 0;

  res.status(200).json({
    courseId,
    totalClips: totalClipsCount,
    completedClips: completedClipsCount,
    percentCompleted,
    progressMatrix: userRows,
  });
});

/**
 * POST /api/progress
 * Update watched duration and complete financial microclips
 */
progressRouter.post('/', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user?.id || '22222222-2222-2222-2222-222222222222';
  
  const parseResult = ProgressLogSchema.safeParse(req.body);
  if (!parseResult.success) {
     res.status(400).json({ error: 'Bad Request', details: parseResult.error.format() });
     return;
  }

  const { courseId, clipId, watchedSeconds, isCompleted } = parseResult.data;

  // Retrieve the Clip to bounds check
  const clip = MemoryDatabase.clips.find(c => c.id === clipId);
  const clipDuration = clip?.duration || 60;

  // Determine actual completion or forced complete flag
  const reachedThreshold = watchedSeconds >= (clipDuration - 2); // 2 second margin
  const finalCompleted = !!isCompleted || reachedThreshold;

  // Look for existing row
  let row = MemoryDatabase.userProgress.find(
    p => p.userId === userId && p.clipId === clipId
  );

  let initialCompleted = false;

  if (row) {
    initialCompleted = row.isCompleted;
    row.watchedSeconds = Math.min(watchedSeconds, clipDuration);
    row.isCompleted = row.isCompleted || finalCompleted;
    row.updatedAt = new Date().toISOString();
  } else {
    row = {
      id: `up-${Math.random().toString(36).substring(7)}`,
      userId,
      courseId,
      clipId,
      watchedSeconds: Math.min(watchedSeconds, clipDuration),
      isCompleted: finalCompleted,
      updatedAt: new Date().toISOString(),
    };
    MemoryDatabase.userProgress.push(row);
  }

  // Gamification: Reward points if first-time completed!
  if (row.isCompleted && !initialCompleted) {
    const profile = MemoryDatabase.profiles.find(p => p.id === userId);
    if (profile) {
      profile.pointsEarned += 25; // Award 25 financial knowledge points
      console.log(`[Gamified Points] Student "${profile.fullName}" earned 25XP for completing clip. Total: ${profile.pointsEarned}XP`);
    }
  }

  res.status(200).json({
    message: row.isCompleted ? 'Learning milestone complete!' : 'Duration updated.',
    progress: row,
  });
});
