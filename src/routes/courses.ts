/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { MemoryDatabase } from '../lib/memoryDb';
import { requireSupabaseAuth, optionalSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

export const coursesRouter = Router();

const CourseCreateSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  imageUrl: z.string().url().optional(),
});

/**
 * GET /api/courses
 * List all active/published courses or full inventory for instruction
 */
coursesRouter.get('/', optionalSupabaseAuth, (req: AuthenticatedRequest, res: Response) => {
  const { difficulty } = req.query;
  let list = MemoryDatabase.courses;

  const rawMockFlag = process.env.ENABLE_DOCKER_MOCKS || '';
  const isMockAllowed = rawMockFlag.trim().toLowerCase().replace(/['"]/g, '') !== 'false' && process.env.REQUIRE_REAL_AUTH !== 'true';

  // Filter unpublished unless logged-in instructor/admin asks otherwise
  let isInstructor = false;
  if (isMockAllowed && req.headers['x-view-mode'] === 'instructor') {
    isInstructor = true;
  } else if (req.user && (req.user.role === 'instructor' || req.user.role === 'admin')) {
    isInstructor = true;
  }

  if (!isInstructor) {
    list = list.filter(c => c.isPublished);
  }

  if (difficulty) {
    list = list.filter(c => c.difficulty === difficulty);
  }

  res.status(200).json(list);
});

/**
 * GET /api/courses/:id
 * Retrieve details of a course and compile associated clips + exercises
 */
coursesRouter.get('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const course = MemoryDatabase.courses.find(c => c.id === id);

  if (!course) {
     res.status(404).json({ error: 'Not Found', message: 'Course profile not found.' });
     return;
  }

  // Retrieve associated clips sorted by sequenceOrder
  const clips = MemoryDatabase.clips
    .filter(clip => clip.courseId === id && clip.status === 'approved')
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  // For each clip, grab exercises
  const clipsWithExercises = clips.map(clip => {
    const exercises = MemoryDatabase.exercises.filter(ex => ex.clipId === clip.id);
    return {
      ...clip,
      exercises,
    };
  });

  res.status(200).json({
    ...course,
    clips: clipsWithExercises,
  });
});

/**
 * POST /api/courses
 * Creating an active course (Instructor-restricted)
 */
coursesRouter.post('/', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (req.user?.role !== 'instructor' && req.user?.role !== 'admin') {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or admins.' });
     return;
  }

  const parseResult = CourseCreateSchema.safeParse(req.body);
  if (!parseResult.success) {
     res.status(400).json({ error: 'Bad Request', details: parseResult.error.format() });
     return;
  }

  const { title, description, difficulty, imageUrl } = parseResult.data;
  const newCourse = {
    id: `c0000000-0000-0000-0000-${Math.random().toString(10).substring(2, 14)}`,
    title,
    description,
    difficulty,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=600',
    instructorId: req.user.id,
    isPublished: false,
    createdAt: new Date().toISOString(),
  };

  MemoryDatabase.courses.push(newCourse);
  res.status(201).json(newCourse);
});

/**
 * PUT /api/courses/:id
 * Update a course (Instructor/Admin only)
 */
coursesRouter.put('/:id', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (req.user?.role !== 'instructor' && req.user?.role !== 'admin') {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or admins.' });
     return;
  }

  const { id } = req.params;
  const course = MemoryDatabase.courses.find(c => c.id === id);
  if (!course) {
    res.status(404).json({ error: 'Not Found', message: 'Course not found.' });
    return;
  }

  const { title, description, difficulty, imageUrl, isPublished } = req.body;

  if (title !== undefined) {
    course.title = title;
    course.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  if (description !== undefined) course.description = description;
  if (difficulty !== undefined) course.difficulty = difficulty;
  if (imageUrl !== undefined) course.imageUrl = imageUrl;
  if (isPublished !== undefined) course.isPublished = !!isPublished;

  res.status(200).json(course);
});

/**
 * DELETE /api/courses/:id
 * Delete a course and its related clips and exercises (Instructor/Admin only)
 */
coursesRouter.delete('/:id', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (req.user?.role !== 'instructor' && req.user?.role !== 'admin') {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or admins.' });
     return;
  }

  const { id } = req.params;
  const courseIndex = MemoryDatabase.courses.findIndex(c => c.id === id);
  if (courseIndex === -1) {
    res.status(404).json({ error: 'Not Found', message: 'Course not found.' });
    return;
  }

  // Remove course
  MemoryDatabase.courses.splice(courseIndex, 1);

  // Remove associated clips and exercises
  const associatedClips = MemoryDatabase.clips.filter(clip => clip.courseId === id);
  const clipIds = associatedClips.map(clip => clip.id);

  MemoryDatabase.clips = MemoryDatabase.clips.filter(clip => clip.courseId !== id);
  MemoryDatabase.exercises = MemoryDatabase.exercises.filter(ex => !clipIds.includes(ex.clipId));

  res.status(200).json({ success: true, message: 'Course and associated content deleted.' });
});

/**
 * POST /api/courses/:id/clips
 * Add a new clip to a course (Instructor/Admin only)
 */
coursesRouter.post('/:id/clips', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (req.user?.role !== 'instructor' && req.user?.role !== 'admin') {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or admins.' });
     return;
  }

  const { id } = req.params;
  const course = MemoryDatabase.courses.find(c => c.id === id);
  if (!course) {
    res.status(404).json({ error: 'Not Found', message: 'Course not found.' });
    return;
  }

  const { title, description, videoUrl, duration, sequenceOrder, section } = req.body;

  if (!title || !videoUrl) {
    res.status(400).json({ error: 'Bad Request', message: 'Title and videoUrl are required.' });
    return;
  }

  const newClip = {
    id: `f0000001-0000-0000-0000-${Math.random().toString(10).substring(2, 14)}`,
    courseId: id,
    title,
    description: description || '',
    videoProviderId: `local-provider-${Math.random().toString(36).substring(5)}`,
    videoUrl,
    duration: Number(duration) || 60,
    sequenceOrder: Number(sequenceOrder) || 1,
    status: 'approved' as const, // Automatically approve self-created clips for instant sandbox play
    section: section || 'General',
  };

  MemoryDatabase.clips.push(newClip);
  res.status(201).json(newClip);
});

/**
 * PUT /api/courses/:id/clips/:clipId
 * Update a clip (Instructor/Admin only)
 */
coursesRouter.put('/:id/clips/:clipId', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (req.user?.role !== 'instructor' && req.user?.role !== 'admin') {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or admins.' });
     return;
  }

  const { id, clipId } = req.params;
  const clip = MemoryDatabase.clips.find(c => c.id === clipId && c.courseId === id);
  if (!clip) {
    res.status(404).json({ error: 'Not Found', message: 'Clip not found in this course.' });
    return;
  }

  const { title, description, videoUrl, duration, sequenceOrder, section } = req.body;

  if (title !== undefined) clip.title = title;
  if (description !== undefined) clip.description = description;
  if (videoUrl !== undefined) clip.videoUrl = videoUrl;
  if (duration !== undefined) clip.duration = Number(duration);
  if (sequenceOrder !== undefined) clip.sequenceOrder = Number(sequenceOrder);
  if (section !== undefined) clip.section = section;

  res.status(200).json(clip);
});

/**
 * DELETE /api/courses/:id/clips/:clipId
 * Delete a clip (Instructor/Admin only)
 */
coursesRouter.delete('/:id/clips/:clipId', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (req.user?.role !== 'instructor' && req.user?.role !== 'admin') {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or admins.' });
     return;
  }

  const { id, clipId } = req.params;
  const clipIndex = MemoryDatabase.clips.findIndex(c => c.id === clipId && c.courseId === id);
  if (clipIndex === -1) {
    res.status(404).json({ error: 'Not Found', message: 'Clip not found.' });
    return;
  }

  MemoryDatabase.clips.splice(clipIndex, 1);
  MemoryDatabase.exercises = MemoryDatabase.exercises.filter(ex => ex.clipId !== clipId);

  res.status(200).json({ success: true, message: 'Clip deleted.' });
});

