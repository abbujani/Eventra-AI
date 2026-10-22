import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { config } from './config.js';
import { getProvider, type AiProvider } from './services/ai/index.js';
import { createHealthRouter } from './routes/health.js';
import { createAiRouter } from './routes/ai.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export interface AppOptions {
  /** Provider getter, overridable for tests. */
  provider?: AiProvider;
}

/**
 * Builds the Express application. Exported separately from the listener so
 * integration tests can mount it with Supertest without opening a port.
 */
export function createApp(options: AppOptions = {}): express.Express {
  const provider = options.provider ?? getProvider();
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );

  app.use(
    cors({
      origin: config.clientOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      credentials: false,
    }),
  );

  app.use(express.json({ limit: config.bodyLimit }));

  // When the built frontend is served from this process, `/` must resolve to
  // index.html. The JSON info banner is only for API-only deployments.
  if (!config.serveStatic) {
    app.get('/', (_req, res) => {
      res.json({
        name: 'Eventra AI API',
        status: 'ok',
        health: '/api/health',
        documentation: 'See README.md and docs/ for API details.',
      });
    });
  }

  app.use('/api/health', createHealthRouter(provider));
  app.use('/api/ai', createAiRouter(provider));

  if (config.serveStatic) {
    const staticPath = path.resolve(config.serveStatic);
    app.use(express.static(staticPath));
    // SPA fallback for client-side routes (never for API paths).
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(path.join(staticPath, 'index.html'), (err) => {
        if (err) next();
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
