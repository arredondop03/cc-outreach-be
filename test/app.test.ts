import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';

// Must be set before the app (and src/env.ts) is imported. Nothing here touches a database.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL ??= 'postgresql://u:p@localhost:5432/test';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-test-secret-test-secret-123';

let server: ReturnType<ReturnType<typeof import('../src/app.js').createApp>['listen']>;
let base: string;

before(async () => {
  const { createApp } = await import('../src/app.js');
  server = createApp().listen(0);
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

test('GET /health returns ok', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('public sign-up is rejected', async () => {
  const res = await fetch(`${base}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
    body: JSON.stringify({ email: 'x@example.com', password: 'password123', name: 'x' }),
  });
  assert.equal(res.status, 400);
  assert.equal(((await res.json()) as { code: string }).code, 'EMAIL_PASSWORD_SIGN_UP_DISABLED');
});
