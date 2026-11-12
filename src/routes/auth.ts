import { z } from 'zod';
import { registry } from '../openapi.js';

// Doc-only: these endpoints are served by Better Auth (mounted in app.ts).
const SignInBody = z.object({ email: z.email(), password: z.string() }).openapi('SignInBody');

registry.registerPath({
  method: 'post',
  path: '/api/auth/sign-in/email',
  summary: 'Sign in with email and password (sets session cookie)',
  request: { body: { content: { 'application/json': { schema: SignInBody } } } },
  responses: { 200: { description: 'Signed in' }, 401: { description: 'Invalid credentials' } },
});

registry.registerPath({
  method: 'get',
  path: '/api/auth/get-session',
  summary: 'Current session and user, or null',
  responses: { 200: { description: 'Session or null' } },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/sign-out',
  summary: 'Delete the session and clear the cookie',
  responses: { 200: { description: 'Signed out' } },
});
