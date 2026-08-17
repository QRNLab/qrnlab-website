import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { sendPasswordResetEmail, sendVerificationEmail } from './mail';
import { users } from './schema';

let cached: Awaited<ReturnType<typeof createAuth>> | null = null;

async function createAuth() {
  const db = await getDb();
  return betterAuth({
    basePath: '/api/auth',
    secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-me',
    trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:4321'],
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
            const db = await getDb();
            const set: Record<string, unknown> = {};
            // Local dev: auto-verify so you can log in without an email round-trip.
            if (process.env.DEV_AUTO_VERIFY === 'true') {
              set.emailVerified = true;
            }
            const admins = (process.env.ADMIN_EMAILS ?? '')
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
