import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: 'student' | 'instructor' | 'admin';
  };
}

// Mock fail-closed (P0 Seguridad): el mock SOLO se activa con opt-in
// explícito (`ALLOW_MOCK_AUTH === 'true'`) Y entorno no-producción.
// Sin opt-in, o en producción, no existe ningún usuario mock.
export function isMockAuthEnabled(): boolean {
  const optIn = (process.env.ALLOW_MOCK_AUTH || '').trim().toLowerCase().replace(/['"]/g, '') === 'true';
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
  return optIn && !isProduction;
}

// Fixture fijo del lado servidor: id, email y ROL nunca salen de headers
// del cliente (antes `x-mock-user-id` permitía elegirse rol admin).
const MOCK_USER = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'student_tester@gmail.com',
  role: 'student' as const,
};

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
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('SUPABASE_JWT_SECRET no configurado en el entorno');
  }

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
 * Mock fail-closed (P0 Seguridad): el actor mock SOLO existe en dev local
 * con opt-in explícito (`ALLOW_MOCK_AUTH === 'true'`) y entorno no-producción.
 */
export function requireSupabaseAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    if (isMockAuthEnabled()) {
      // Fixture fijo del servidor para flujos de preview local
      req.user = { ...MOCK_USER };
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
    if (isMockAuthEnabled()) {
      // Fallback solo en sandbox local con opt-in
      req.user = { ...MOCK_USER };
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

  if (!authHeader) {
    if (isMockAuthEnabled()) {
      req.user = { ...MOCK_USER };
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
    // En sandbox local con opt-in, fixture fijo como fallback
    if (isMockAuthEnabled()) {
      req.user = { ...MOCK_USER };
    }
  }
  next();
}

