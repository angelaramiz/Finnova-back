/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import { MemoryDatabase } from '../lib/memoryDb';
import { requireSupabaseAuth, optionalSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';
import { z } from 'zod';

export const coursesRouter = Router();

const CourseCreateSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  imageUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  category: z.string().optional(),
  learningPath: z.string().optional(),
});

function mapCourse(dbCourse: any) {
  if (!dbCourse) return null;
  return {
    id: dbCourse.id,
    title: dbCourse.title,
    description: dbCourse.description,
    difficulty: dbCourse.difficulty,
    slug: dbCourse.slug,
    imageUrl: dbCourse.imageUrl !== undefined ? dbCourse.imageUrl : dbCourse.image_url,
    instructorId: dbCourse.instructorId !== undefined ? dbCourse.instructorId : dbCourse.instructor_id,
    isPublished: dbCourse.isPublished !== undefined ? dbCourse.isPublished : dbCourse.is_published,
    category: dbCourse.category,
    learningPath: dbCourse.learningPath !== undefined ? dbCourse.learningPath : dbCourse.learning_path,
    createdAt: dbCourse.createdAt !== undefined ? dbCourse.createdAt : dbCourse.created_at
  };
}

function mapClip(dbClip: any) {
  if (!dbClip) return null;
  return {
    id: dbClip.id,
    courseId: dbClip.courseId !== undefined ? dbClip.courseId : dbClip.course_id,
    title: dbClip.title,
    description: dbClip.description,
    videoProviderId: dbClip.videoProviderId !== undefined ? dbClip.videoProviderId : dbClip.video_provider_id,
    videoUrl: dbClip.videoUrl !== undefined ? dbClip.videoUrl : dbClip.video_url,
    duration: dbClip.duration,
    sequenceOrder: dbClip.sequenceOrder !== undefined ? dbClip.sequenceOrder : dbClip.sequence_order,
    status: dbClip.status,
    section: dbClip.section,
    videoFormat: dbClip.videoFormat !== undefined ? dbClip.videoFormat : (dbClip.video_format || '9:16'),
    createdAt: dbClip.createdAt !== undefined ? dbClip.createdAt : dbClip.created_at
  };
}

function mapExercise(dbEx: any) {
  if (!dbEx) return null;
  return {
    id: dbEx.id,
    clipId: dbEx.clipId !== undefined ? dbEx.clipId : dbEx.clip_id,
    title: dbEx.title,
    exerciseType: dbEx.exerciseType !== undefined ? dbEx.exerciseType : dbEx.exercise_type,
    question: dbEx.question,
    prompt: dbEx.prompt,
    correctAnswer: dbEx.correctAnswer !== undefined ? dbEx.correctAnswer : dbEx.correct_answer,
    rubrics: dbEx.rubrics,
    maxPoints: dbEx.maxPoints !== undefined ? dbEx.maxPoints : dbEx.max_points
  };
}

/**
 * GET /api/courses
 * List all active/published courses or full inventory for instruction
 */
coursesRouter.get('/', optionalSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { difficulty } = req.query;
  const isSupabaseConfigured = isSupabaseReady();

  if (isSupabaseConfigured) {
    try {
      let query = supabaseAdmin.from('courses').select('*');
      
      const rawMockFlag = process.env.ENABLE_DOCKER_MOCKS || '';
      const isMockAllowed = rawMockFlag.trim().toLowerCase().replace(/['"]/g, '') !== 'false' && process.env.REQUIRE_REAL_AUTH !== 'true';

      let isInstructor = false;
      if (isMockAllowed && req.headers['x-view-mode'] === 'instructor') {
        isInstructor = true;
      } else if (req.user && (req.user.role === 'instructor' || req.user.role === 'admin')) {
        isInstructor = true;
      }

      if (!isInstructor) {
        query = query.eq('isPublished', true);
      }

      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      const { data, error } = await query;
      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      // Fetch clips for these courses to populate list for the frontends
      const courseIds = (data || []).map(c => c.id);
      let clipsData: any[] = [];
      if (courseIds.length > 0) {
        const { data: clips, error: clipsError } = await supabaseAdmin
          .from('clips')
          .select('*')
          .in('courseId', courseIds)
          .order('sequenceOrder', { ascending: true });
        if (!clipsError && clips) {
          clipsData = clips;
        }
      }

      const mapped = (data || []).map(dbCourse => {
        const course = mapCourse(dbCourse);
        const courseClips = clipsData
          .filter(clip => (clip.courseId || clip.course_id) === dbCourse.id)
          .map(mapClip);
        return {
          ...course,
          clips: courseClips
        };
      });

      res.status(200).json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  let list = MemoryDatabase.courses;
  const rawMockFlag = process.env.ENABLE_DOCKER_MOCKS || '';
  const isMockAllowed = rawMockFlag.trim().toLowerCase().replace(/['"]/g, '') !== 'false' && process.env.REQUIRE_REAL_AUTH !== 'true';

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

  const listWithClips = list.map(course => {
    const courseClips = MemoryDatabase.clips
      .filter(clip => clip.courseId === course.id)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    return {
      ...course,
      clips: courseClips
    };
  });

  res.status(200).json(listWithClips);
});

/**
 * GET /api/courses/:id
 * Retrieve details of a course and compile associated clips + exercises
 */
coursesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const isSupabaseConfigured = isSupabaseReady();

  if (isSupabaseConfigured) {
    try {
      const { data: course, error: courseErr } = await supabaseAdmin
        .from('courses')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (courseErr) {
        res.status(500).json({ error: 'Database Error', message: courseErr.message });
        return;
      }

      if (!course) {
        res.status(404).json({ error: 'Not Found', message: 'Course profile not found.' });
        return;
      }

      const { data: clips, error: clipsErr } = await supabaseAdmin
        .from('clips')
        .select('*')
        .eq('courseId', id)
        .eq('status', 'approved')
        .order('sequenceOrder', { ascending: true });

      if (clipsErr) {
        res.status(500).json({ error: 'Database Error', message: clipsErr.message });
        return;
      }

      const clipsWithExercises = [];
      for (const clip of (clips || [])) {
        const { data: exercises, error: exErr } = await supabaseAdmin
          .from('exercises')
          .select('*')
          .eq('clipId', clip.id);
        
        clipsWithExercises.push({
          ...mapClip(clip),
          exercises: (exercises || []).map(mapExercise)
        });
      }

      res.status(200).json({
        ...mapCourse(course),
        clips: clipsWithExercises,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const course = MemoryDatabase.courses.find(c => c.id === id);

  if (!course) {
     res.status(404).json({ error: 'Not Found', message: 'Course profile not found.' });
     return;
  }

  const clips = MemoryDatabase.clips
    .filter(clip => clip.courseId === id && clip.status === 'approved')
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

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
coursesRouter.post('/', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'instructor' && req.user?.role !== 'admin') {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or admins.' });
     return;
  }

  const parseResult = CourseCreateSchema.safeParse(req.body);
  if (!parseResult.success) {
     res.status(400).json({ error: 'Bad Request', details: parseResult.error.format() });
     return;
  }

  const { title, description, difficulty, imageUrl, category, learningPath } = parseResult.data;
  const isSupabaseConfigured = isSupabaseReady();

  if (isSupabaseConfigured) {
    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const { data: newCourse, error } = await supabaseAdmin
        .from('courses')
        .insert({
          title,
          description,
          difficulty,
          slug,
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=600',
          instructorId: req.user.id,
          isPublished: false,
          category: category || 'General',
          learning_path: learningPath || 'Ruta General'
        })
        .select()
        .maybeSingle();

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      res.status(201).json(mapCourse(newCourse));
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const newCourse = {
    id: `c0000000-0000-0000-0000-${Math.random().toString(10).substring(2, 14)}`,
    title,
    description,
    difficulty,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=600',
    instructorId: req.user.id,
    isPublished: false,
    category: category || 'General',
    learningPath: learningPath || 'Ruta General',
    createdAt: new Date().toISOString(),
  };

  MemoryDatabase.courses.push(newCourse);
  res.status(201).json(newCourse);
});

/**
 * PUT /api/courses/:id
 * Update a course (Instructor/Admin only)
 */
coursesRouter.put('/:id', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'instructor' && req.user?.role !== 'admin') {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or admins.' });
     return;
  }

  const { id } = req.params;
  const { title, description, difficulty, imageUrl, isPublished, category, learningPath } = req.body;
  const isSupabaseConfigured = isSupabaseReady();

  if (isSupabaseConfigured) {
    try {
      const updateData: any = {};
      if (title !== undefined) {
        updateData.title = title;
        updateData.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      }
      if (description !== undefined) updateData.description = description;
      if (difficulty !== undefined) updateData.difficulty = difficulty;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (isPublished !== undefined) updateData.isPublished = !!isPublished;
      if (category !== undefined) updateData.category = category;
      if (learningPath !== undefined) updateData.learning_path = learningPath;

      const { data: updatedCourse, error } = await supabaseAdmin
        .from('courses')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      if (!updatedCourse) {
        res.status(404).json({ error: 'Not Found', message: 'Course not found.' });
        return;
      }

      res.status(200).json(mapCourse(updatedCourse));
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const course = MemoryDatabase.courses.find(c => c.id === id);
  if (!course) {
    res.status(404).json({ error: 'Not Found', message: 'Course not found.' });
    return;
  }

  if (title !== undefined) {
    course.title = title;
    course.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  if (description !== undefined) course.description = description;
  if (difficulty !== undefined) course.difficulty = difficulty;
  if (imageUrl !== undefined) course.imageUrl = imageUrl;
  if (isPublished !== undefined) course.isPublished = !!isPublished;
  if (category !== undefined) course.category = category;
  if (learningPath !== undefined) course.learningPath = learningPath;

  res.status(200).json(course);
});

/**
 * DELETE /api/courses/:id
 * Delete a course and its related clips and exercises (Instructor/Admin only)
 */
coursesRouter.delete('/:id', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'instructor' && req.user?.role !== 'admin') {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or admins.' });
     return;
  }

  const { id } = req.params;
  const isSupabaseConfigured = isSupabaseReady();

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabaseAdmin
        .from('courses')
        .delete()
        .eq('id', id);

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      res.status(200).json({ success: true, message: 'Course and associated content deleted.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const courseIndex = MemoryDatabase.courses.findIndex(c => c.id === id);
  if (courseIndex === -1) {
    res.status(404).json({ error: 'Not Found', message: 'Course not found.' });
    return;
  }

  MemoryDatabase.courses.splice(courseIndex, 1);
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
coursesRouter.post('/:id/clips', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'instructor' && req.user?.role !== 'admin') {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or admins.' });
     return;
  }

  const { id } = req.params;
  const { title, description, videoUrl, duration, sequenceOrder, section, videoFormat } = req.body;

  if (!title || !videoUrl) {
    res.status(400).json({ error: 'Bad Request', message: 'Title and videoUrl are required.' });
    return;
  }

  const isSupabaseConfigured = isSupabaseReady();

  if (isSupabaseConfigured) {
    try {
      const { data: newClip, error } = await supabaseAdmin
        .from('clips')
        .insert({
          courseId: id,
          title,
          description: description || '',
          videoProviderId: `local-provider-${Math.random().toString(36).substring(5)}`,
          videoUrl: videoUrl,
          duration: Number(duration) || 60,
          sequenceOrder: Number(sequenceOrder) || 1,
          status: 'approved',
          section: section || 'General',
          videoFormat: videoFormat || '9:16'
        })
        .select()
        .maybeSingle();

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      res.status(201).json(mapClip(newClip));
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
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
    status: 'approved' as const,
    section: section || 'General',
    videoFormat: videoFormat || '9:16',
  };

  MemoryDatabase.clips.push(newClip);
  res.status(201).json(newClip);
});

/**
 * PUT /api/courses/:id/clips/:clipId
 * Update a clip (Instructor/Admin only)
 */
coursesRouter.put('/:id/clips/:clipId', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'instructor' && req.user?.role !== 'admin') {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or admins.' });
     return;
  }

  const { id, clipId } = req.params;
  const { title, description, videoUrl, duration, sequenceOrder, section, videoFormat } = req.body;
  const isSupabaseConfigured = isSupabaseReady();

  if (isSupabaseConfigured) {
    try {
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
      if (duration !== undefined) updateData.duration = Number(duration);
      if (sequenceOrder !== undefined) updateData.sequenceOrder = Number(sequenceOrder);
      if (section !== undefined) updateData.section = section;
      if (videoFormat !== undefined) updateData.videoFormat = videoFormat;

      const { data: updatedClip, error } = await supabaseAdmin
        .from('clips')
        .update(updateData)
        .eq('id', clipId)
        .eq('courseId', id)
        .select()
        .maybeSingle();

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      if (!updatedClip) {
        res.status(404).json({ error: 'Not Found', message: 'Clip not found in this course.' });
        return;
      }

      res.status(200).json(mapClip(updatedClip));
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const clip = MemoryDatabase.clips.find(c => c.id === clipId && c.courseId === id);
  if (!clip) {
    res.status(404).json({ error: 'Not Found', message: 'Clip not found in this course.' });
    return;
  }

  if (title !== undefined) clip.title = title;
  if (description !== undefined) clip.description = description;
  if (videoUrl !== undefined) clip.videoUrl = videoUrl;
  if (duration !== undefined) clip.duration = Number(duration);
  if (sequenceOrder !== undefined) clip.sequenceOrder = Number(sequenceOrder);
  if (section !== undefined) clip.section = section;
  if (videoFormat !== undefined) clip.videoFormat = videoFormat;

  res.status(200).json(clip);
});

/**
 * DELETE /api/courses/:id/clips/:clipId
 * Delete a clip (Instructor/Admin only)
 */
coursesRouter.delete('/:id/clips/:clipId', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'instructor' && req.user?.role !== 'admin') {
     res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors or admins.' });
     return;
  }

  const { id, clipId } = req.params;
  const isSupabaseConfigured = isSupabaseReady();

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabaseAdmin
        .from('clips')
        .delete()
        .eq('id', clipId)
        .eq('courseId', id);

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      res.status(200).json({ success: true, message: 'Clip deleted.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const clipIndex = MemoryDatabase.clips.findIndex(c => c.id === clipId && c.courseId === id);
  if (clipIndex === -1) {
    res.status(404).json({ error: 'Not Found', message: 'Clip not found.' });
    return;
  }

  MemoryDatabase.clips.splice(clipIndex, 1);
  MemoryDatabase.exercises = MemoryDatabase.exercises.filter(ex => ex.clipId !== clipId);

  res.status(200).json({ success: true, message: 'Clip deleted.' });
});

/**
 * POST /api/courses/upload-image
 * Upload a base64 course image to Supabase Storage or return base64 fallback.
 */
coursesRouter.post('/upload-image', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { base64Image } = req.body;
  if (!base64Image) {
    res.status(400).json({ error: 'Bad Request', message: 'Se requiere la imagen en base64.' });
    return;
  }

  const isSupabaseConfigured = isSupabaseReady();
  if (isSupabaseConfigured) {
    try {
      const match = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: 'Bad Request', message: 'Formato de base64 no válido.' });
        return;
      }
      const contentType = match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `course_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.png`;

      await supabaseAdmin.storage.createBucket('course-images', { public: true });

      const { data, error } = await supabaseAdmin.storage
        .from('course-images')
        .upload(fileName, buffer, {
          contentType,
          upsert: true
        });

      if (error) {
        res.status(500).json({ error: 'Storage Error', message: error.message });
        return;
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('course-images')
        .getPublicUrl(fileName);

      res.status(200).json({ imageUrl: publicUrlData.publicUrl });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  res.status(200).json({ imageUrl: base64Image });
});
