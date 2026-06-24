/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { MemoryDatabase, AllowedEmail, StudentQuestion } from '../lib/memoryDb';
import { requireSupabaseAuth, AuthenticatedRequest } from '../middleware/auth';
import { EmailProvider } from '../providers/email';
import { supabaseAdmin, isSupabaseReady } from '../lib/supabaseClient';

// true cuando SUPABASE_URL + SERVICE_ROLE_KEY están configurados con claves reales
// Acepta tanto el formato nuevo (sb_secret_...) como el legacy (eyJ...)
const isSupabaseConfigured = isSupabaseReady();

function signMockJWT(userId: string, email: string, role: string, fullName: string): string {
  const currentUnix = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    email,
    exp: currentUnix + 3600 * 24 * 7, // 7 days expiration
    user_metadata: {
      role,
      full_name: fullName
    }
  };

  const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const message = `${headerB64}.${payloadB64}`;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'your-default-local-supabase-jwt-secret-for-signing';
  const signature = crypto.createHmac('sha256', jwtSecret).update(message).digest('base64url');
  return `${message}.${signature}`;
}

function generateDeterministicUUID(email: string): string {
  const hash = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

export const authRouter = Router();

/**
 * GET /api/auth/me
 * Retrieves current active profile info and points stats
 */
authRouter.get('/me', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || '22222222-2222-2222-2222-222222222222';
  
  if (isSupabaseConfigured) {
    try {
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !profile) {
        res.status(200).json({
          id: userId,
          fullName: 'Inversor Novato Base',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          role: 'student',
          pointsEarned: 100,
        });
        return;
      }
      res.status(200).json(profile);
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const profile = MemoryDatabase.profiles.find(p => p.id === userId);

  if (!profile) {
    // Dynamically insert profile block if absent
     res.status(200).json({
      id: userId,
      fullName: 'Inversor Novato Base',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      role: 'student',
      pointsEarned: 100,
    });
     return;
  }

  res.status(200).json(profile);
});

/**
 * POST /api/auth/role
 * Utility endpoint to easily toggle actor role ('student' <-> 'instructor') during sandbox tests
 */
authRouter.post('/role', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || '22222222-2222-2222-2222-222222222222';
  const { role } = req.body;

  if (role !== 'student' && role !== 'instructor' && role !== 'admin') {
     res.status(400).json({ error: 'Bad Request', message: 'Invalid role state requested.' });
     return;
  }

  if (isSupabaseConfigured) {
    try {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const newProfile = {
        id: userId,
        fullName: existingProfile?.fullName || (role === 'instructor' ? 'Profe Sandbox' : 'Inversor Novato'),
        avatarUrl: existingProfile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        role,
        pointsEarned: existingProfile?.pointsEarned ?? 150,
      };

      const { data: updatedProfile, error } = await supabaseAdmin
        .from('profiles')
        .upsert(newProfile)
        .select('*')
        .single();

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      res.status(200).json({
        message: 'Role patched in development simulation.',
        profile: updatedProfile,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const profile = MemoryDatabase.profiles.find(p => p.id === userId);
  if (profile) {
    profile.role = role;
     res.status(200).json({
      message: 'Role patched in development simulation.',
      profile,
    });
     return;
  }

  // Create profile if missing
  const newProfile = {
    id: userId,
    fullName: role === 'instructor' ? 'Profe Sandbox' : 'Inversor Novato',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    role,
    pointsEarned: 150,
  };
  MemoryDatabase.profiles.push(newProfile);

  res.status(201).json({
    message: 'Profile spawned with requested role.',
    profile: newProfile,
  });
});

/**
 * GET /api/auth/allowed-emails
 * List all permitted school emails (Admin-only)
 */
authRouter.get('/allowed-emails', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden', message: 'Restricted to administrators.' });
    return;
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from('allowed_emails')
        .select('*');
      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }
      res.status(200).json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  res.status(200).json(MemoryDatabase.allowedEmails);
});

/**
 * POST /api/auth/allowed-emails
 * Add an email to permitted directory (Admin-only)
 */
authRouter.post('/allowed-emails', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden', message: 'Restricted to administrators.' });
    return;
  }

  const { email, role, fullName } = req.body;
  if (!email || !role || !fullName) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields (email, role, fullName).' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('allowed_emails')
        .select('email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existing) {
        res.status(400).json({ error: 'Conflict', message: 'El correo electrónico ya está registrado.' });
        return;
      }

      const newAllowed = {
        email: normalizedEmail,
        role,
        fullName: fullName.trim(),
        createdAt: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('allowed_emails')
        .insert(newAllowed)
        .select('*')
        .single();

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }
      res.status(201).json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  if (MemoryDatabase.allowedEmails.some(a => a.email.toLowerCase() === normalizedEmail)) {
    res.status(400).json({ error: 'Conflict', message: 'El correo electrónico ya está registrado.' });
    return;
  }

  const newAllowed: AllowedEmail = {
    email: normalizedEmail,
    role,
    fullName: fullName.trim(),
    createdAt: new Date().toISOString()
  };

  MemoryDatabase.allowedEmails.push(newAllowed);
  res.status(201).json(newAllowed);
});

/**
 * DELETE /api/auth/allowed-emails/:email
 * Remove an email from permitted directory (Admin-only)
 */
authRouter.delete('/allowed-emails/:email', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden', message: 'Restricted to administrators.' });
    return;
  }

  const { email } = req.params;
  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('allowed_emails')
        .select('email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!existing) {
        res.status(404).json({ error: 'Not Found', message: 'Correo electrónico no encontrado en la lista.' });
        return;
      }

      const { error } = await supabaseAdmin
        .from('allowed_emails')
        .delete()
        .eq('email', normalizedEmail);

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }
      res.status(200).json({ message: 'Correo electrónico removido exitosamente.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const index = MemoryDatabase.allowedEmails.findIndex(a => a.email.toLowerCase() === normalizedEmail);

  if (index === -1) {
    res.status(404).json({ error: 'Not Found', message: 'Correo electrónico no encontrado en la lista.' });
    return;
  }

  MemoryDatabase.allowedEmails.splice(index, 1);
  res.status(200).json({ message: 'Correo electrónico removido exitosamente.' });
});

/**
 * POST /api/auth/login-simulated
 * Sandbox testing login to generate simulated JWT for allowed emails
 */
authRouter.post('/login-simulated', async (req: any, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Bad Request', message: 'Email required.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured) {
    try {
      const { data: allowed, error: allowedError } = await supabaseAdmin
        .from('allowed_emails')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!allowed) {
        res.status(403).json({ 
          error: 'Forbidden', 
          message: `El correo ${email} no está autorizado en esta escuela. Contacta al administrador.` 
        });
        return;
      }

      let userId = '22222222-2222-2222-2222-222222222222';
      if (normalizedEmail === 'admin@finnova.academy') {
        userId = '33333333-3333-3333-3333-333333333333';
      } else if (normalizedEmail === 'profesor.senior@finanzas.edu') {
        userId = '11111111-1111-1111-1111-111111111111';
      } else if (normalizedEmail === 'student_tester@gmail.com') {
        userId = '22222222-2222-2222-2222-222222222222';
      } else {
        userId = generateDeterministicUUID(normalizedEmail);
      }

      let { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) {
        profile = {
          id: userId,
          fullName: allowed.fullName,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(allowed.fullName)}`,
          role: allowed.role,
          pointsEarned: allowed.role === 'student' ? 100 : 0
        };
        await supabaseAdmin.from('profiles').insert(profile);
      }

      const token = signMockJWT(userId, normalizedEmail, allowed.role, allowed.fullName);

      res.status(200).json({
        token,
        profile
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const allowed = MemoryDatabase.allowedEmails.find(a => a.email.toLowerCase() === normalizedEmail);

  if (!allowed) {
    res.status(403).json({ 
      error: 'Forbidden', 
      message: `El correo ${email} no está autorizado en esta escuela. Contacta al administrador.` 
    });
    return;
  }

  // Determine standard UUID or generate random UUID
  let userId = '22222222-2222-2222-2222-222222222222';
  if (normalizedEmail === 'admin@finnova.academy') {
    userId = '33333333-3333-3333-3333-333333333333';
  } else if (normalizedEmail === 'profesor.senior@finanzas.edu') {
    userId = '11111111-1111-1111-1111-111111111111';
  } else if (normalizedEmail === 'student_tester@gmail.com') {
    userId = '22222222-2222-2222-2222-222222222222';
  } else {
    // Generate deterministic UUID based on email
    userId = generateDeterministicUUID(normalizedEmail);
  }

  // Find or create profile
  let profile = MemoryDatabase.profiles.find(p => p.id === userId);
  if (!profile) {
    profile = {
      id: userId,
      fullName: allowed.fullName,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(allowed.fullName)}`,
      role: allowed.role,
      pointsEarned: allowed.role === 'student' ? 100 : 0
    };
    MemoryDatabase.profiles.push(profile);
  }

  // Sign mock JWT token using the HS256 algorithm defined in auth middleware
  const token = signMockJWT(userId, normalizedEmail, allowed.role, allowed.fullName);

  res.status(200).json({
    token,
    profile
  });
});

/**
 * GET /api/auth/questions
 * Retrieve questions based on auth role (Student: own, Staff: all)
 */
authRouter.get('/questions', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user?.id || '22222222-2222-2222-2222-222222222222';
  const role = req.user?.role || 'student';

  if (role === 'student') {
    const list = MemoryDatabase.questions.filter(q => q.studentId === userId);
    res.status(200).json(list);
  } else {
    res.status(200).json(MemoryDatabase.questions);
  }
});

/**
 * POST /api/auth/questions
 * Submit a student question regarding a course and lesson (Student-only)
 */
authRouter.post('/questions', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user?.id || '22222222-2222-2222-2222-222222222222';
  const { courseId, courseTitle, clipId, clipTitle, questionText } = req.body;

  if (!courseId || !courseTitle || !clipId || !clipTitle || !questionText) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing fields (courseId, courseTitle, clipId, clipTitle, questionText).' });
    return;
  }

  const profile = MemoryDatabase.profiles.find(p => p.id === userId);
  const studentName = profile?.fullName || 'Estudiante';

  const newQuestion: StudentQuestion = {
    id: `q-${Math.random().toString(36).substring(2, 10)}`,
    studentId: userId,
    studentName,
    courseId,
    courseTitle,
    clipId,
    clipTitle,
    questionText: questionText.trim(),
    createdAt: new Date().toISOString()
  };

  MemoryDatabase.questions.push(newQuestion);
  res.status(201).json(newQuestion);
});

/**
 * POST /api/auth/questions/:id/reply
 * Reply to a student question (Instructor/Admin-only)
 */
authRouter.post('/questions/:id/reply', requireSupabaseAuth, (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { replyText } = req.body;
  const role = req.user?.role || 'student';

  if (role !== 'instructor' && role !== 'admin') {
    res.status(403).json({ error: 'Forbidden', message: 'Restricted to instructors and administrators.' });
    return;
  }

  if (!replyText || !replyText.trim()) {
    res.status(400).json({ error: 'Bad Request', message: 'replyText is required.' });
    return;
  }

  const question = MemoryDatabase.questions.find(q => q.id === id);
  if (!question) {
    res.status(404).json({ error: 'Not Found', message: 'Question not found.' });
    return;
  }

  question.replyText = replyText.trim();
  question.repliedAt = new Date().toISOString();

  res.status(200).json(question);
});

/**
 * POST /api/auth/register-requests
 * Submit a request to register an account
 */
authRouter.post('/register-requests', async (req: any, res: Response): Promise<void> => {
  const { fullName, email, role, specialty } = req.body;
  if (!fullName || !email || !role) {
    res.status(400).json({ error: 'Bad Request', message: 'Faltan campos obligatorios.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured) {
    try {
      const { data: allowed } = await supabaseAdmin
        .from('allowed_emails')
        .select('email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (allowed) {
        res.status(400).json({ error: 'Conflict', message: 'El correo electrónico ya está registrado.' });
        return;
      }

      const { data: requestPending } = await supabaseAdmin
        .from('account_requests')
        .select('id')
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .maybeSingle();

      if (requestPending) {
        res.status(400).json({ error: 'Conflict', message: 'Ya existe una solicitud de registro pendiente para este correo.' });
        return;
      }

      const newRequest = {
        id: `req-${Math.random().toString(36).substring(2, 10)}`,
        fullName: fullName.trim(),
        email: normalizedEmail,
        role,
        specialty: specialty?.trim() || null,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('account_requests')
        .insert(newRequest)
        .select('*')
        .single();

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }
      res.status(201).json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  // Check if email already in allowedEmails or already requested
  const alreadyAllowed = MemoryDatabase.allowedEmails.some(a => a.email.toLowerCase() === normalizedEmail);
  const alreadyRequested = MemoryDatabase.accountRequests.some(r => r.email.toLowerCase() === normalizedEmail && r.status === 'pending');

  if (alreadyAllowed) {
    res.status(400).json({ error: 'Conflict', message: 'El correo electrónico ya está registrado.' });
    return;
  }
  if (alreadyRequested) {
    res.status(400).json({ error: 'Conflict', message: 'Ya existe una solicitud de registro pendiente para este correo.' });
    return;
  }

  const newRequest: any = {
    id: `req-${Math.random().toString(36).substring(2, 10)}`,
    fullName: fullName.trim(),
    email: normalizedEmail,
    role,
    specialty: specialty?.trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  MemoryDatabase.accountRequests.push(newRequest);
  res.status(201).json(newRequest);
});

/**
 * GET /api/auth/register-requests
 * Retrieve all account registration requests (Admin-only)
 */
authRouter.get('/register-requests', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden', message: 'Restringido a administradores.' });
    return;
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from('account_requests')
        .select('*');
      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }
      res.status(200).json(data);
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  res.status(200).json(MemoryDatabase.accountRequests);
});

/**
 * POST /api/auth/register-requests/:id/approve
 * Approve registration request (Admin-only)
 */
authRouter.post('/register-requests/:id/approve', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden', message: 'Restringido a administradores.' });
    return;
  }

  const { id } = req.params;

  if (isSupabaseConfigured) {
    try {
      const { data: request, error: fetchError } = await supabaseAdmin
        .from('account_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!request) {
        res.status(404).json({ error: 'Not Found', message: 'Solicitud no encontrada.' });
        return;
      }

      if (request.status !== 'pending') {
        res.status(400).json({ error: 'Bad Request', message: 'La solicitud ya ha sido procesada.' });
        return;
      }

      // Generate random 8-character temporary password
      const tempPassword = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Encriptar la contraseña temporal usando bcryptjs
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(tempPassword, salt);

      // Create allowedEmail record
      const { error: allowedErr } = await supabaseAdmin
        .from('allowed_emails')
        .upsert({
          email: request.email,
          role: request.role,
          fullName: request.fullName,
          createdAt: new Date().toISOString()
        }, { onConflict: 'email' });

      if (allowedErr) {
        res.status(500).json({ error: 'Database Error', message: allowedErr.message });
        return;
      }

      // 1. Check if auth user already exists in auth.users
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      let authUser = authUsers?.users?.find((u: any) => u.email === request.email);

      let targetUserId: string;

      if (!authUser) {
        // Create the user in Supabase auth.users
        const { data: newAuthUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: request.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            role: request.role,
            full_name: request.fullName
          }
        });

        if (authErr || !newAuthUser.user) {
          res.status(500).json({ error: 'Auth Creation Error', message: authErr?.message || 'Fallo al crear el usuario en Supabase Auth.' });
          return;
        }
        targetUserId = newAuthUser.user.id;
      } else {
        targetUserId = authUser.id;
      }

      // Create Profile with temp password
      const newProfile = {
        id: targetUserId,
        fullName: request.fullName,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(request.fullName)}`,
        role: request.role,
        pointsEarned: request.role === 'student' ? 100 : 0,
        passwordHash: hashedPassword,
        mustChangePassword: true,
        updatedAt: new Date().toISOString()
      };

      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .upsert(newProfile);

      if (profileErr) {
        res.status(500).json({ error: 'Database Error', message: profileErr.message });
        return;
      }

      await supabaseAdmin
        .from('account_requests')
        .update({ status: 'approved' })
        .eq('id', id);

      const portalName = request.role === 'instructor' ? 'Personal/Docente' : 'Alumnos';
      const loginUrl = request.role === 'instructor'
        ? 'https://finnova-staff.onrender.com'
        : 'https://finnova-academy.onrender.com';

      const textContent = `¡Hola ${request.fullName}!

Tu cuenta para ingresar a FinNova Academy ha sido creada.
Usa las siguientes credenciales para acceder a la plataforma:

  - Portal: ${portalName}
  - Enlace de Acceso: ${loginUrl}
  - Correo: ${request.email}
  - Contraseña Temporal: ${tempPassword}

⚠️ IMPORTANTE: Tan pronto como inicies sesión, el sistema te obligará a cambiar esta contraseña temporal por una personal y segura.
Además, cada inicio de sesión requerirá verificación OTP vía correo.

¡Te damos la bienvenida al equipo!`;

      const htmlContent = `
        <h2>¡Hola ${request.fullName}!</h2>
        <p>Tu cuenta para ingresar a <strong>FinNova Academy</strong> ha sido creada.</p>
        <p>Usa las siguientes credenciales para acceder a la plataforma:</p>
        <ul>
          <li><strong>Portal:</strong> ${portalName}</li>
          <li><strong>Enlace de Acceso:</strong> <a href="${loginUrl}" target="_blank" style="color: #0d9488; font-weight: bold; text-decoration: underline;">${loginUrl}</a></li>
          <li><strong>Correo:</strong> ${request.email}</li>
          <li><strong>Contraseña Temporal:</strong> <code>${tempPassword}</code></li>
        </ul>
        <p>⚠️ <strong>IMPORTANTE:</strong> Tan pronto como inicies sesión, el sistema te obligará a cambiar esta contraseña temporal por una personal y segura. Además, cada inicio de sesión requerirá verificación OTP vía correo.</p>
        <p>¡Te damos la bienvenida al equipo!</p>
      `;

      EmailProvider.sendEmail({
        to: request.email,
        subject: 'Tu cuenta en FinNova Academy ha sido creada',
        html: htmlContent,
        text: textContent,
        type: 'credentials'
      }).catch(err => console.error('Error enviando correo de credenciales:', err));

      res.status(200).json({ 
        message: 'Solicitud aprobada y cuenta creada exitosamente.',
        tempPassword,
        request: { ...request, status: 'approved' }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const request = MemoryDatabase.accountRequests.find(r => r.id === id);

  if (!request) {
    res.status(404).json({ error: 'Not Found', message: 'Solicitud no encontrada.' });
    return;
  }

  if (request.status !== 'pending') {
    res.status(400).json({ error: 'Bad Request', message: 'La solicitud ya ha sido procesada.' });
    return;
  }

  // Generate random 8-character temporary password
  const tempPassword = Math.random().toString(36).substring(2, 10).toUpperCase();

  // Encriptar la contraseña temporal usando bcryptjs
  const hashedPassword = bcrypt.hashSync(tempPassword, 10);

  // Create allowedEmail record
  const newAllowed = {
    email: request.email,
    role: request.role,
    fullName: request.fullName,
    createdAt: new Date().toISOString()
  };
  MemoryDatabase.allowedEmails.push(newAllowed);

  // Generate deterministic UUID
  const userId = generateDeterministicUUID(request.email);

  // Create Profile with temp password
  const newProfile = {
    id: userId,
    fullName: request.fullName,
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(request.fullName)}`,
    role: request.role as 'student' | 'instructor',
    pointsEarned: request.role === 'student' ? 100 : 0,
    passwordHash: hashedPassword, // Guardar contraseña temporal encriptada
    mustChangePassword: true
  };
  MemoryDatabase.profiles.push(newProfile);

  request.status = 'approved';

  const portalName = request.role === 'instructor' ? 'Personal/Docente' : 'Alumnos';
  const textContent = `¡Hola ${request.fullName}!

Tu cuenta para ingresar a AuraFi Academy ha sido creada.
Usa las siguientes credenciales para acceder a la plataforma:

  - Portal: ${portalName}
  - Correo: ${request.email}
  - Contraseña Temporal: ${tempPassword}

⚠️ IMPORTANTE: Tan pronto como inicies sesión, el sistema te obligará a cambiar esta contraseña temporal por una personal y segura.
Además, cada inicio de sesión requerirá verificación OTP vía correo.

¡Te damos la bienvenida al equipo!`;

  const htmlContent = `
    <h2>¡Hola ${request.fullName}!</h2>
    <p>Tu cuenta para ingresar a <strong>AuraFi Academy</strong> ha sido creada.</p>
    <p>Usa las siguientes credenciales para acceder a la plataforma:</p>
    <ul>
      <li><strong>Portal:</strong> ${portalName}</li>
      <li><strong>Correo:</strong> ${request.email}</li>
      <li><strong>Contraseña Temporal:</strong> <code>${tempPassword}</code></li>
    </ul>
    <p>⚠️ <strong>IMPORTANTE:</strong> Tan pronto como inicies sesión, el sistema te obligará a cambiar esta contraseña temporal por una personal y segura. Además, cada inicio de sesión requerirá verificación OTP vía correo.</p>
    <p>¡Te damos la bienvenida al equipo!</p>
  `;

  EmailProvider.sendEmail({
    to: request.email,
    subject: 'Tu cuenta en AuraFi Academy ha sido creada',
    html: htmlContent,
    text: textContent,
    type: 'credentials'
  }).catch(err => console.error('Error enviando correo de credenciales:', err));

  res.status(200).json({ 
    message: 'Solicitud aprobada y cuenta creada exitosamente.',
    tempPassword,
    request
  });
});

/**
 * POST /api/auth/register-requests/:id/reject
 * Reject registration request (Admin-only)
 */
authRouter.post('/register-requests/:id/reject', requireSupabaseAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden', message: 'Restringido a administradores.' });
    return;
  }

  const { id } = req.params;

  if (isSupabaseConfigured) {
    try {
      const { data: request } = await supabaseAdmin
        .from('account_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!request) {
        res.status(404).json({ error: 'Not Found', message: 'Solicitud no encontrada.' });
        return;
      }

      if (request.status !== 'pending') {
        res.status(400).json({ error: 'Bad Request', message: 'La solicitud ya ha sido procesada.' });
        return;
      }

      const { error } = await supabaseAdmin
        .from('account_requests')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      request.status = 'rejected';
      res.status(200).json({ message: 'Solicitud rechazada.', request });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const request = MemoryDatabase.accountRequests.find(r => r.id === id);

  if (!request) {
    res.status(404).json({ error: 'Not Found', message: 'Solicitud no encontrada.' });
    return;
  }

  if (request.status !== 'pending') {
    res.status(400).json({ error: 'Bad Request', message: 'La solicitud ya ha sido procesada.' });
    return;
  }

  request.status = 'rejected';
  res.status(200).json({ message: 'Solicitud rechazada.', request });
});

/**
 * POST /api/auth/login-credentials
 * Authenticate with email and password (traditional flow)
 */
authRouter.post('/login-credentials', async (req: any, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Bad Request', message: 'Se requiere correo y contraseña.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured) {
    try {
      const { data: allowed } = await supabaseAdmin
        .from('allowed_emails')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!allowed) {
        res.status(401).json({ error: 'Unauthorized', message: 'Credenciales inválidas.' });
        return;
      }

      // Buscar perfil directamente por email en auth.users → luego por su id en profiles
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = authUsers?.users?.find((u: any) => u.email === normalizedEmail);

      if (!authUser) {
        res.status(401).json({ error: 'Unauthorized', message: 'Credenciales inválidas.' });
        return;
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!profile) {
        res.status(401).json({ error: 'Unauthorized', message: 'Credenciales inválidas.' });
        return;
      }

      // Validar contraseña (soporta texto plano heredado o bcrypt)
      let isMatch = false;
      if (profile.passwordHash) {
        if (profile.passwordHash.startsWith('$2a$') || profile.passwordHash.startsWith('$2b$')) {
          isMatch = await bcrypt.compare(password, profile.passwordHash);
        } else {
          isMatch = profile.passwordHash === password;
        }
      }

      if (!isMatch) {
        res.status(401).json({ error: 'Unauthorized', message: 'Credenciales inválidas.' });
        return;
      }


      if (profile.mustChangePassword) {
        res.status(200).json({ status: 'MUST_CHANGE_PASSWORD', email: normalizedEmail });
        return;
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ otpCode, otpExpires })
        .eq('id', profile.id);

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      const textContent = `Tu código OTP de un solo uso para iniciar sesión es: ${otpCode}

Este código expira en 5 minutos. No lo compartas con nadie.`;

      const htmlContent = `
        <h3>Código de verificación OTP</h3>
        <p>Tu código OTP de un solo uso para iniciar sesión es:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 10px; background-color: #f3f4f6; text-align: center; border-radius: 8px; margin: 15px 0; font-family: monospace;">
          ${otpCode}
        </div>
        <p>Este código expira en 5 minutos. No lo compartas con nadie.</p>
      `;

      EmailProvider.sendEmail({
        to: normalizedEmail,
        subject: `Código de verificación OTP: ${otpCode}`,
        html: htmlContent,
        text: textContent,
        type: 'otp'
      }).catch(err => console.error('Error enviando correo de OTP:', err));

      res.status(200).json({ status: 'OTP_REQUIRED', email: normalizedEmail });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const profile = MemoryDatabase.profiles.find(p => {
    // Buscar perfil que coincida con el email en allowedEmails
    const allowed = MemoryDatabase.allowedEmails.find(a => a.email.toLowerCase() === normalizedEmail);
    return allowed && p.fullName === allowed.fullName;
  });

  if (!profile) {
    res.status(401).json({ error: 'Unauthorized', message: 'Credenciales inválidas.' });
    return;
  }

  // Validar contraseña localmente con bcrypt
  let isMatch = false;
  if (profile.passwordHash) {
    if (profile.passwordHash.startsWith('$2a$') || profile.passwordHash.startsWith('$2b$')) {
      isMatch = bcrypt.compareSync(password, profile.passwordHash);
    } else {
      isMatch = profile.passwordHash === password;
    }
  }

  if (!isMatch) {
    res.status(401).json({ error: 'Unauthorized', message: 'Credenciales inválidas.' });
    return;
  }

  // Check if password must be changed first
  if (profile.mustChangePassword) {
    res.status(200).json({ status: 'MUST_CHANGE_PASSWORD', email: normalizedEmail });
    return;
  }

  // Generate 6 digit OTP code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes expiration

  profile.otpCode = otpCode;
  profile.otpExpires = otpExpires;

  const textContent = `Tu código OTP de un solo uso para iniciar sesión es: ${otpCode}

Este código expira en 5 minutos. No lo compartas con nadie.`;

  const htmlContent = `
    <h3>Código de verificación OTP</h3>
    <p>Tu código OTP de un solo uso para iniciar sesión es:</p>
    <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 10px; background-color: #f3f4f6; text-align: center; border-radius: 8px; margin: 15px 0; font-family: monospace;">
      ${otpCode}
    </div>
    <p>Este código expira en 5 minutos. No lo compartas con nadie.</p>
  `;

  EmailProvider.sendEmail({
    to: normalizedEmail,
    subject: `Código de verificación OTP: ${otpCode}`,
    html: htmlContent,
    text: textContent,
    type: 'otp'
  }).catch(err => console.error('Error enviando correo de OTP:', err));

  res.status(200).json({ status: 'OTP_REQUIRED', email: normalizedEmail });
});

/**
 * POST /api/auth/change-password-force
 * Change password when forced (mustChangePassword flag is true)
 */
authRouter.post('/change-password-force', async (req: any, res: Response): Promise<void> => {
  const { email, currentTempPassword, newPassword } = req.body;
  if (!email || !currentTempPassword || !newPassword) {
    res.status(400).json({ error: 'Bad Request', message: 'Faltan campos obligatorios.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured) {
    try {
      const { data: allowed } = await supabaseAdmin
        .from('allowed_emails')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!allowed) {
        res.status(401).json({ error: 'Unauthorized', message: 'Contraseña temporal incorrecta.' });
        return;
      }

      // Buscar perfil por email en auth.users → id en profiles
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = authUsers?.users?.find((u: any) => u.email === normalizedEmail);

      if (!authUser) {
        res.status(401).json({ error: 'Unauthorized', message: 'Contraseña temporal incorrecta.' });
        return;
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!profile) {
        res.status(401).json({ error: 'Unauthorized', message: 'Contraseña temporal incorrecta.' });
        return;
      }

      // Validar contraseña temporal encriptada
      let isMatch = false;
      console.log('[Auth Debug] change-password-force profile:', {
        id: profile.id,
        mustChangePassword: profile.mustChangePassword,
        hasPasswordHash: !!profile.passwordHash,
        passwordHashPrefix: profile.passwordHash ? profile.passwordHash.substring(0, 8) : 'null',
        currentTempPasswordSent: currentTempPassword
      });

      if (profile.passwordHash) {
        if (profile.passwordHash.startsWith('$2a$') || profile.passwordHash.startsWith('$2b$')) {
          isMatch = await bcrypt.compare(currentTempPassword, profile.passwordHash);
        } else {
          isMatch = profile.passwordHash === currentTempPassword;
        }
      }
      console.log('[Auth Debug] change-password-force isMatch:', isMatch);

      if (!isMatch) {
        res.status(401).json({ error: 'Unauthorized', message: 'Contraseña temporal incorrecta.' });
        return;
      }

      if (!profile.mustChangePassword) {
        res.status(400).json({ error: 'Bad Request', message: 'Esta cuenta ya actualizó su contraseña temporal.' });
        return;
      }

      // Encriptar la nueva contraseña definitiva
      const salt = await bcrypt.genSalt(10);
      const newHashedPassword = await bcrypt.hash(newPassword, salt);

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ passwordHash: newHashedPassword, mustChangePassword: false })
        .eq('id', profile.id);

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      res.status(200).json({ message: 'Contraseña actualizada correctamente. Procede a iniciar sesión.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const profile = MemoryDatabase.profiles.find(p => {
    const allowed = MemoryDatabase.allowedEmails.find(a => a.email.toLowerCase() === normalizedEmail);
    return allowed && p.fullName === allowed.fullName;
  });

  if (!profile) {
    res.status(401).json({ error: 'Unauthorized', message: 'Contraseña temporal incorrecta.' });
    return;
  }

  // Validar contraseña localmente
  let isTempMatch = false;
  if (profile.passwordHash) {
    if (profile.passwordHash.startsWith('$2a$') || profile.passwordHash.startsWith('$2b$')) {
      isTempMatch = bcrypt.compareSync(currentTempPassword, profile.passwordHash);
    } else {
      isTempMatch = profile.passwordHash === currentTempPassword;
    }
  }

  if (!isTempMatch) {
    res.status(401).json({ error: 'Unauthorized', message: 'Contraseña temporal incorrecta.' });
    return;
  }

  if (!profile.mustChangePassword) {
    res.status(400).json({ error: 'Bad Request', message: 'Esta cuenta ya actualizó su contraseña temporal.' });
    return;
  }

  // Encriptar nueva contraseña definitiva local
  profile.passwordHash = bcrypt.hashSync(newPassword, 10);
  profile.mustChangePassword = false;

  res.status(200).json({ message: 'Contraseña actualizada correctamente. Procede a iniciar sesión.' });
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP code and issue JWT
 */
authRouter.post('/verify-otp', async (req: any, res: Response): Promise<void> => {
  const { email, otpCode } = req.body;
  if (!email || !otpCode) {
    res.status(400).json({ error: 'Bad Request', message: 'Correo y código OTP requeridos.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured) {
    try {
      const { data: allowed } = await supabaseAdmin
        .from('allowed_emails')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!allowed) {
        res.status(401).json({ error: 'Unauthorized', message: 'Código OTP incorrecto.' });
        return;
      }

      // Buscar perfil por email en auth.users → id en profiles
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = authUsers?.users?.find((u: any) => u.email === normalizedEmail);

      if (!authUser) {
        res.status(401).json({ error: 'Unauthorized', message: 'Código OTP incorrecto.' });
        return;
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!profile || profile.otpCode !== otpCode) {
        res.status(401).json({ error: 'Unauthorized', message: 'Código OTP incorrecto.' });
        return;
      }

      if (profile.otpExpires && new Date() > new Date(profile.otpExpires)) {
        res.status(401).json({ error: 'Unauthorized', message: 'El código OTP ha expirado. Solicita otro inicio de sesión.' });
        return;
      }

      // Si el perfil tiene mustChangePassword: true, guardamos el hash del otpCode como passwordHash
      // para que sirva de contraseña temporal en el cambio de contraseña forzado (flujo de reset).
      const salt = await bcrypt.genSalt(10);
      const hashedOtp = await bcrypt.hash(otpCode, salt);

      console.log('[Auth Debug] verify-otp profile:', {
        id: profile.id,
        mustChangePassword: profile.mustChangePassword,
        otpCode: profile.otpCode,
        hasPasswordHash: !!profile.passwordHash
      });

      const updatePayload = { 
        otpCode: null, 
        otpExpires: null,
        ...(profile.mustChangePassword ? { passwordHash: hashedOtp } : {})
      };

      console.log('[Auth Debug] verify-otp updatePayload:', updatePayload);

      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', profile.id);

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      const token = signMockJWT(profile.id, normalizedEmail, profile.role, profile.fullName);

      res.status(200).json({
        token,
        profile
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const profile = MemoryDatabase.profiles.find(p => {
    const allowed = MemoryDatabase.allowedEmails.find(a => a.email.toLowerCase() === normalizedEmail);
    return allowed && p.fullName === allowed.fullName;
  });

  if (!profile || profile.otpCode !== otpCode) {
    res.status(401).json({ error: 'Unauthorized', message: 'Código OTP incorrecto.' });
    return;
  }

  // Check expiration
  if (profile.otpExpires && new Date() > new Date(profile.otpExpires)) {
    res.status(401).json({ error: 'Unauthorized', message: 'El código OTP ha expirado. Solicita otro inicio de sesión.' });
    return;
  }

  // Clear OTP code
  profile.otpCode = undefined;
  profile.otpExpires = undefined;
  if (profile.mustChangePassword) {
    profile.passwordHash = bcrypt.hashSync(otpCode, 10);
  }

  // Sign mock JWT token using the HS256 algorithm defined in auth middleware
  const token = signMockJWT(profile.id, normalizedEmail, profile.role, profile.fullName);

  res.status(200).json({
    token,
    profile
  });
});

/**
 * POST /api/auth/request-password-reset
 * Genera un OTP temporal para restablecer la contraseña
 */
authRouter.post('/request-password-reset', async (req: any, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Bad Request', message: 'Correo institucional requerido.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured) {
    try {
      const { data: allowed } = await supabaseAdmin
        .from('allowed_emails')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!allowed) {
        res.status(404).json({ error: 'Not Found', message: 'La cuenta de correo no está registrada en el sistema.' });
        return;
      }

      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = authUsers?.users?.find((u: any) => u.email === normalizedEmail);

      if (!authUser) {
        res.status(404).json({ error: 'Not Found', message: 'La cuenta no tiene un perfil activo en la base de datos de autenticación.' });
        return;
      }

      // Generar OTP para recuperación
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiración para reset

      // Guardamos la OTP y habilitamos temporalmente mustChangePassword para forzar el reset
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ otpCode, otpExpires, mustChangePassword: true })
        .eq('id', authUser.id);

      if (error) {
        res.status(500).json({ error: 'Database Error', message: error.message });
        return;
      }

      const textContent = `Has solicitado restablecer tu contraseña en AuraFi Academy.
Tu código OTP de restablecimiento es: ${otpCode}

Este código expira en 10 minutos. No lo compartas con nadie.`;

      const htmlContent = `
        <h3>Restablecimiento de Contraseña</h3>
        <p>Has solicitado restablecer tu contraseña en AuraFi Academy. Tu código OTP de un solo uso es:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 10px; background-color: #f3f4f6; text-align: center; border-radius: 8px; margin: 15px 0; font-family: monospace;">
          ${otpCode}
        </div>
        <p>Este código expira en 10 minutos. Una vez verificado, podrás elegir una contraseña nueva.</p>
      `;

      EmailProvider.sendEmail({
        to: normalizedEmail,
        subject: `Recuperar Contraseña - Código: ${otpCode}`,
        html: htmlContent,
        text: textContent,
        type: 'otp'
      }).catch(err => console.error('Error enviando correo de reset OTP:', err));

      res.status(200).json({ message: 'Código de recuperación enviado.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    return;
  }

  const profile = MemoryDatabase.profiles.find(p => {
    const allowed = MemoryDatabase.allowedEmails.find(a => a.email.toLowerCase() === normalizedEmail);
    return allowed && p.fullName === allowed.fullName;
  });

  if (!profile) {
    res.status(404).json({ error: 'Not Found', message: 'La cuenta de correo no existe.' });
    return;
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  profile.otpCode = otpCode;
  profile.otpExpires = otpExpires;
  profile.mustChangePassword = true;

  console.log(`[RESET PASSWORD MOCK OTP] Código enviado a ${normalizedEmail}: ${otpCode}`);

  res.status(200).json({ message: 'Código de recuperación enviado (simulación local).' });
});


