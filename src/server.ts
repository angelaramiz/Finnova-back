/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import domain sub-routers
import { authRouter } from './routes/auth';
import { coursesRouter } from './routes/courses';
import { progressRouter } from './routes/progress';
import { exercisesRouter } from './routes/exercises';
import { pipelineRouter } from './routes/pipeline';
import { webhookRouter } from './webhooks/n8n';
import { simulatorRouter } from './routes/simulator';

// Constants for ES Module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root folder (.env.local and .env)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const app = express();

// Set up rawBody preservation for Webhook HMAC Cryptographic checks
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Memory rate limiter mapping IPs to request counts
const rateLimitWindow = 60 * 1000; // 1 minute
const rateLimitMax = 45; // limit to 45 requests per minute per IP
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  const now = Date.now();
  
  let record = ipRequestCounts.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + rateLimitWindow };
    ipRequestCounts.set(ip, record);
    return next();
  }
  
  record.count++;
  if (record.count > rateLimitMax) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please slow down and try again later.',
    });
    return;
  }
  next();
}

// Custom high-performance CORS, security headers and rate limiter middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const isProduction = process.env.NODE_ENV === 'production';

  // Orígenes permitidos: portales de Render + localhost para desarrollo
  const ALLOWED_ORIGINS = [
    process.env.ALUMNOS_URL,
    process.env.STAFF_URL,
    process.env.APP_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  if (origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!isProduction) {
    // En desarrollo local sin origin definido, permitir cualquiera
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-view-mode, x-mock-user-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Strict HTTP Security headers
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "img-src 'self' data: https:; " +
    "media-src 'self' https: data: blob:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "connect-src 'self' https: http://localhost:* ws://localhost:* ws://127.0.0.1:* http://127.0.0.1:*;"
  );

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Apply rate limiter to all api endpoints
app.use('/api', apiRateLimiter);

// Structural Custom JSON Logger mimicking Pino outputs
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      JSON.stringify({
        level: 'info',
        time: new Date().toISOString(),
        msg: 'request completed',
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTimeMs: duration,
        userAgent: req.headers['user-agent'] || 'unknown',
      })
    );
  });
  next();
});

// Bind routing modules
app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/progress', progressRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/webhooks', webhookRouter);
app.use('/api/simulator', simulatorRouter);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Production: Host SPA static resources
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  const distPath = path.join(__dirname, '../../alumnos/dist');
  app.use(express.static(distPath));
  
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Exception error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.log(
    JSON.stringify({
      level: 'error',
      time: new Date().toISOString(),
      msg: 'unexpected server error',
      error: err.message || err,
      stack: err.stack,
    })
  );

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: isProduction ? 'An unexpected error occurred.' : err.message,
  });
});

// Arrancar el servidor — siempre en Render, opcional en modo local
const PORT = process.env.PORT || 3000;
if (process.env.RUN_STANDALONE === 'true' || isProduction || process.env.RENDER) {
  app.listen(PORT, () => {
    console.log(
      JSON.stringify({
        level: 'info',
        time: new Date().toISOString(),
        msg: `AuraFi Academy backend escuchando en puerto ${PORT}`,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          RENDER: !!process.env.RENDER,
          ENABLE_DOCKER_MOCKS: process.env.ENABLE_DOCKER_MOCKS,
          supabaseConfigured: !!(process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('placeholder')),
        }
      })
    );
  });
}
