/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { MemoryDatabase } from '../lib/memoryDb';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';
import { z } from 'zod';

export const progressRouter = Router();

const ProgressLogSchema = z.object({
  courseId: z.string(),
  clipId: z.string(),
  watchedSeconds: z.number().nonnegative(),
  isCompleted: z.boolean().optional(),
});

function mapProgress(dbProgress: any) {
  if (!dbProgress) return null;
  return {
    id: dbProgress.id,
    userId: dbProgress.user_id,
    courseId: dbProgress.course_id,
    clipId: dbProgress.clip_id,
    watchedSeconds: dbProgress.watched_seconds,
    isCompleted: dbProgress.is_completed,
    updatedAt: dbProgress.updated_at
  };
}

/**
 * GET /api/progress/:courseId
 * Retrieve user completion rate for a specific course
 */
progressRouter.get('/:courseId', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || '22222222-2222-2222-2222-222222222222';
  const { courseId } = req.params;
  const isSupabaseConfigured = isSupabaseReady();

  if (isSupabaseConfigured) {
    try {
      // Find user progress rows
      const { data: userRows, error: userErr } = await supabaseAdmin
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId);

      if (userErr) {
        res.status(500).json({ error: 'Database Error', message: userErr.message });
        return;
      }

      // Find course clips
      const { data: courseClips, error: clipsErr } = await supabaseAdmin
        .from('clips')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'approved');

      if (clipsErr) {
        res.status(500).json({ error: 'Database Error', message: clipsErr.message });
        return;
      }

      const totalClipsCount = (courseClips || []).length;
      const completedClipsCount = (userRows || []).filter(p => p.is_completed).length;

      const percentCompleted = totalClipsCount > 0 
        ? Math.round((completedClipsCount / totalClipsCount) * 100)
        : 0;

      res.status(200).json({
        courseId,
        totalClips: totalClipsCount,
        completedClips: completedClipsCount,
        percentCompleted,
        progressMatrix: (userRows || []).map(mapProgress),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

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
progressRouter.post('/', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || '22222222-2222-2222-2222-222222222222';
  
  const parseResult = ProgressLogSchema.safeParse(req.body);
  if (!parseResult.success) {
     res.status(400).json({ error: 'Bad Request', details: parseResult.error.format() });
     return;
  }

  const { courseId, clipId, watchedSeconds, isCompleted } = parseResult.data;
  const isSupabaseConfigured = isSupabaseReady();

  if (isSupabaseConfigured) {
    try {
      // Find clip to bounds check
      const { data: clip, error: clipErr } = await supabaseAdmin
        .from('clips')
        .select('*')
        .eq('id', clipId)
        .maybeSingle();

      if (clipErr) {
        res.status(500).json({ error: 'Database Error', message: clipErr.message });
        return;
      }

      const clipDuration = clip?.duration || 60;
      const reachedThreshold = watchedSeconds >= (clipDuration - 2);
      const finalCompleted = !!isCompleted || reachedThreshold;

      // Find existing row
      const { data: existingRow, error: findErr } = await supabaseAdmin
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('clip_id', clipId)
        .maybeSingle();

      if (findErr) {
        res.status(500).json({ error: 'Database Error', message: findErr.message });
        return;
      }

      let initialCompleted = false;
      let finalRow;

      if (existingRow) {
        initialCompleted = existingRow.is_completed;
        const { data: updated, error: updateErr } = await supabaseAdmin
          .from('user_progress')
          .update({
            watched_seconds: Math.min(watchedSeconds, clipDuration),
            is_completed: existingRow.is_completed || finalCompleted,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRow.id)
          .select()
          .maybeSingle();

        if (updateErr) {
          res.status(500).json({ error: 'Database Error', message: updateErr.message });
          return;
        }
        finalRow = updated;
      } else {
        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from('user_progress')
          .insert({
            user_id: userId,
            course_id: courseId,
            clip_id: clipId,
            watched_seconds: Math.min(watchedSeconds, clipDuration),
            is_completed: finalCompleted,
            updated_at: new Date().toISOString()
          })
          .select()
          .maybeSingle();

        if (insertErr) {
          res.status(500).json({ error: 'Database Error', message: insertErr.message });
          return;
        }
        finalRow = inserted;
      }

      // Gamification: Reward points if first-time completed!
      if (finalRow.is_completed && !initialCompleted) {
        // Fetch current points from profile
        const { data: profile, error: profErr } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (profile && !profErr) {
          const newPoints = (profile.pointsEarned || 0) + 25;
          await supabaseAdmin
            .from('profiles')
            .update({ pointsEarned: newPoints })
            .eq('id', userId);
          console.log(`[Gamified Points] Student "${profile.fullName}" earned 25XP for completing clip. Total: ${newPoints}XP`);
        }
      }

      res.status(200).json({
        message: finalRow.is_completed ? 'Learning milestone complete!' : 'Duration updated.',
        progress: mapProgress(finalRow),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const clip = MemoryDatabase.clips.find(c => c.id === clipId);
  const clipDuration = clip?.duration || 60;
  const reachedThreshold = watchedSeconds >= (clipDuration - 2);
  const finalCompleted = !!isCompleted || reachedThreshold;

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

  if (row.isCompleted && !initialCompleted) {
    const profile = MemoryDatabase.profiles.find(p => p.id === userId);
    if (profile) {
      profile.pointsEarned += 25;
      console.log(`[Gamified Points] Student "${profile.fullName}" earned 25XP for completing clip. Total: ${profile.pointsEarned}XP`);
    }
  }

  res.status(200).json({
    message: row.isCompleted ? 'Learning milestone complete!' : 'Duration updated.',
    progress: row,
  });
});
