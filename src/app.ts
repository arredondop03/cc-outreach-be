import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './env.js';
import { auth } from './lib/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { requireAuth } from './middleware/requireAuth.js';
import { generateOpenApiDocument } from './openapi.js';
import './routes/auth.js';
import { healthRouter } from './routes/health.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(requestLogger);
  app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
  // Better Auth must be mounted before express.json() (it reads the raw body itself).
  app.all('/api/auth/*splat', toNodeHandler(auth));
  app.use(express.json({ limit: '100kb' }));

  app.use(healthRouter);

  // Generated once, after all routes have registered their paths.
  const openApiDocument = generateOpenApiDocument();
  app.get('/openapi.json', requireAuth, (_req, res) => {
    res.json(openApiDocument);
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
