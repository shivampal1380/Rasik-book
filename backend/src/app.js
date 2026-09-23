import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { env, isProd } from './config/env.js';
import { prisma } from './utils/prisma.js';
import { errorHandler } from './middleware/error.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { NotFoundError } from './utils/errors.js';

import authRoutes from './routes/auth.routes.js';
import bookRoutes from './routes/book.routes.js';
import systemRoutes from './routes/system.routes.js';
import searchRoutes from './routes/search.routes.js';

const logger = pino({ name: 'app' });

const app = express();
app.disable('x-powered-by');

// Trust local proxy (nginx) so req.ip is accurate behind a reverse proxy
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

const allowedOrigins = env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      // allow server-to-server / curl with no Origin
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(
        Object.assign(new Error('Origin not allowed by CORS'), {
          statusCode: 403,
          code: 'CORS_ORIGIN_DENIED',
        }),
      );
    },
    credentials: true,
  }),
);

app.use(cookieParser());

// Request logging
app.use(
  pinoHttp({
    logger: pino({ name: 'http' }),
    autoLogging: !isProd,
    redact: { paths: ['req.headers.authorization', 'req.headers.cookie'] },
  }),
);

app.use(express.json({ limit: '1mb' }));

// Health check (unauthenticated)
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'book-entry-backend', time: new Date().toISOString() } });
});

app.use('/api/auth', authRoutes);
app.use('/api/books', apiRateLimiter, bookRoutes);
app.use('/api', systemRoutes);
app.use('/api/search', apiRateLimiter, searchRoutes);

// 404 for unknown API routes
app.use('/api', (_req, _res, next) => next(new NotFoundError('API endpoint not found', 'ROUTE_NOT_FOUND')));

// Fallback for anything non-API
app.use((_req, _res, next) => next(new NotFoundError()));

// Central error handler
app.use(errorHandler);

export { app, logger, prisma };