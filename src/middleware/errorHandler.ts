import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { HttpError } from '../lib/errors.js';

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: { message: `Not found: ${req.method} ${req.path}` } });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    res.status(400).json({ error: { message: 'Validation failed', details: err.issues } });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: { message: 'Already exists', details: err.meta } });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { message: 'Not found' } });
      return;
    }
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message, details: err.details } });
    return;
  }

  // body-parser and similar errors carry a 4xx status
  const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) req.log.error({ err }, 'Unhandled error');
  res.status(status).json({ error: { message: status === 500 ? 'Internal server error' : err.message } });
};
