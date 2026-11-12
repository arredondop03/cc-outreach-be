import { fromNodeHeaders } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';
import { auth } from '../lib/auth.js';
import { HttpError } from '../lib/errors.js';

export type SessionData = typeof auth.$Infer.Session;

declare module 'express-serve-static-core' {
  interface Request {
    session?: SessionData;
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) throw new HttpError(401, 'Unauthorized');
  req.session = session;
  next();
}
