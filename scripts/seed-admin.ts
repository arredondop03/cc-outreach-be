import { env } from '../src/env.js';
import { auth } from '../src/lib/auth.js';
import { prisma } from '../src/lib/prisma.js';

const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = env;
if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
  process.exit(1);
}

const ctx = await auth.$context;
if (await ctx.internalAdapter.findUserByEmail(email)) {
  console.log(`Admin ${email} already exists`);
} else {
  const user = await ctx.internalAdapter.createUser(
    { email, name: 'Admin', emailVerified: true },
    { method: 'admin' },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: await ctx.password.hash(password),
  });
  console.log(`Created admin ${email}`);
}
await prisma.$disconnect();
