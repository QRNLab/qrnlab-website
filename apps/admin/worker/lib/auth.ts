import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { sendPasswordResetEmail, sendVerificationEmail } from './mail';
import { users } from './schema';
import { env } from './cf-env';

let cached: Awaited<ReturnType<typeof createAuth>> | null = null;

async function createAuth() {
  const db = getDb();
  return betterAuth({
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET ?? 'dev-secret-change-me',
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'],
      },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 60, max: 5 },
      },
    },
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: false,
          defaultValue: 'member',
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const db = getDb();
            const set: Record<string, unknown> = {};
            if (env.DEV_AUTO_VERIFY === 'true') {
              set.emailVerified = true;
            }
            const admins = (env.ADMIN_EMAILS ?? '')
              .split(',')
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);
            if (admins.includes(user.email.toLowerCase())) {
              set.role = 'admin';
            }
            if (Object.keys(set).length > 0) {
              await db.update(users).set(set).where(eq(users.id, user.id));
            }
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetEmail(user.email, url);
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail(user.email, url);
      },
      autoSignInAfterVerification: true,
    },
  });
}

export async function getAuth() {
  if (!cached) cached = await createAuth();
  return cached;
}
