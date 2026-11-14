import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { env } from '../env.js';
import { prisma } from './prisma.js';

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.FRONTEND_ORIGIN],
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: { '/sign-in/email': { window: 60, max: 5 } },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
});
