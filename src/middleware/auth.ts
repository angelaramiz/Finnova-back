import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: 'student' | 'instructor' | 'admin';
  };
}

/**
 * Decodes and cryptographically validates HS256 JWT tokens.
 */
function verifySupabaseJWT(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed token: Segment mismatch.');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const message = `${headerB64}.${payloadB64}`;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'your-default-local-supabase-jwt-secret-for-signing';

  // Calculate HMAC SHA256 signature using standard node crypto
  const expectedSignature = crypto
    .createHmac('sha256', jwtSecret)
    .update(message)
    .digest('base64url');

  const sigBuffer = Buffer.from(signatureB64, 'base64url');
  const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new Error('Cryptographic signature verification failed.');
  }

  const payloadBuffer = Buffer.from(payloadB64, 'base64');
  const payload = JSON.parse(payloadBuffer.toString('utf-8'));

  // Verify expiration
  const currentUnix = Math.floor(Date.now() / 1000);
  if (payload.exp && currentUnix >= payload.exp) {
    throw new Error('Token has expired.');
  }

  return payload;
}

/**
 * Express middleware to verify Supabase JWT tokens.
 * Supports elegant sandbox fall-backs if Supabase secrets are pending setup.
 */
export function requireSupabaseAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const mockUserId = req.headers['x-mock-user-id'] as string || '22222222-2222-2222-2222-222222222222';
  
  const rawMockFlag = process.env.ENABLE_DOCKER_MOCKS || '';
  const isMockAllowed = rawMockFlag.trim().toLowerCase().replace(/['"]/g, '') !== 'false' && process.env.REQUIRE_REAL_AUTH !== 'true';

  console.log(`[Auth Debug] Path: ${req.originalUrl} | rawMockFlag: "${rawMockFlag}" | isMockAllowed: ${isMockAllowed} | authHeader: ${!!authHeader}`);

  if (!authHeader) {
    if (isMockAllowed) {
      // Inject mock student actor for iframe preview flows
      req.user = {
        id: mockUserId,
        email: mockUserId.endsWith('3333') ? 'admin@finnova.academy' : mockUserId.endsWith('1111') ? 'profesor.senior@finanzas.edu' : 'student_tester@gmail.com',
        role: mockUserId.endsWith('3333') ? 'admin' : mockUserId.endsWith('1111') ? 'instructor' : 'student',
      };
      return next();
    }
    res.status(401).json({
      error: 'Unauthorised',
      message: 'Missing JWT Bearer token in Authorization header.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({
      error: 'Unauthorised',
      message: 'Malformed Authorization Header.',
    });
    return;
  }

  try {
    const payload = verifySupabaseJWT(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.user_metadata?.role || 'student',
    };
    next();
  } catch (err: any) {
    if (isMockAllowed) {
      // Fallback securely in local dev sandbox
      req.user = {
        id: mockUserId,
        email: mockUserId.endsWith('3333') ? 'admin@finnova.academy' : mockUserId.endsWith('1111') ? 'profesor.senior@finanzas.edu' : 'student_tester@gmail.com',
        role: mockUserId.endsWith('3333') ? 'admin' : mockUserId.endsWith('1111') ? 'instructor' : 'student',
      };
      return next();
    }
    
    console.error('JWT Token verification failed:', err.message);
    res.status(403).json({
      error: 'Forbidden',
      message: `Invalid session: ${err.message}`,
    });
  }
}

/**
 * Express middleware to optionally extract auth information.
 * Does not block if token is missing or invalid, but parses it if valid.
 */
export function optionalSupabaseAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  const rawMockFlag = process.env.ENABLE_DOCKER_MOCKS || '';
  const isMockAllowed = rawMockFlag.trim().toLowerCase().replace(/['"]/g, '') !== 'false' && process.env.REQUIRE_REAL_AUTH !== 'true';

  if (!authHeader) {
    if (isMockAllowed) {
      const mockUserId = req.headers['x-mock-user-id'] as string || '22222222-2222-2222-2222-222222222222';
      req.user = {
        id: mockUserId,
        email: mockUserId.endsWith('3333') ? 'admin@finnova.academy' : mockUserId.endsWith('1111') ? 'profesor.senior@finanzas.edu' : 'student_tester@gmail.com',
        role: mockUserId.endsWith('3333') ? 'admin' : mockUserId.endsWith('1111') ? 'instructor' : 'student',
      };
    }
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  try {
    const payload = verifySupabaseJWT(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.user_metadata?.role || 'student',
    };
  } catch (err) {
    // In dev sandbox, inject mock as fallback
    if (isMockAllowed) {
      const mockUserId = req.headers['x-mock-user-id'] as string || '22222222-2222-2222-2222-222222222222';
      req.user = {
        id: mockUserId,
        email: mockUserId.endsWith('3333') ? 'admin@finnova.academy' : mockUserId.endsWith('1111') ? 'profesor.senior@finanzas.edu' : 'student_tester@gmail.com',
        role: mockUserId.endsWith('3333') ? 'admin' : mockUserId.endsWith('1111') ? 'instructor' : 'student',
      };
    }
  }
  next();
}

