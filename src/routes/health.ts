import { Router } from 'express';
import { z } from 'zod';
import { registry } from '../openapi.js';

const HealthResponse = z.object({ status: z.literal('ok') }).openapi('HealthResponse');

registry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Liveness check',
  responses: {
    200: { description: 'Service is up', content: { 'application/json': { schema: HealthResponse } } },
  },
});

export const healthRouter = Router();
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
