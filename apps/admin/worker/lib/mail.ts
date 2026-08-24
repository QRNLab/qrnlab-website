import { Resend } from 'resend';
import { env } from './cf-env';

const FROM_EMAIL = env.MAIL_FROM ?? 'QRNLab <onboarding@qrnlab.dev>';
let cached: Resend | null = null;

function getResend(): Resend | null {
  if (cached !== null) return cached;
  if (!env.RESEND_API_KEY) {
    cached = null;
    return cached;
  }
  cached = new Resend(env.RESEND_API_KEY);
  return cached;
}

export async function sendVerificationEmail(to: string, url: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Verify your QRNLab account',
    link: withCallbackUrl(url, '/account'),
    linkText: 'Verify email',
  });
}

function withCallbackUrl(url: string, callback: string): string {
  try {
    const u = new URL(url);
    const base = env.BETTER_AUTH_URL ?? 'http://localhost:4321';
    u.searchParams.set('callbackURL', `${base}${callback}`);
    return u.toString();
  } catch {
    return url;
  }
}

async function sendEmail(opts: { to: string; subject: string; link: string; linkText: string }): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn(`[mail] RESEND_API_KEY not set — "${opts.subject}" skipped for ${opts.to}: ${opts.link}`);
    return;
  }
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: opts.to,
    subject: opts.subject,
    html: `
      <p>Someone requested this email for your QRNLab account.</p>
      <p><a href="${opts.link}">${opts.linkText}</a></p>
      <p>If you did not request this, you can ignore this message.</p>
    `,
  });
  if (error) {
    console.error(`[mail] Resend rejected "${opts.subject}" for ${opts.to}:`, JSON.stringify(error));
  } else {
    console.log(`[mail] "${opts.subject}" sent to ${opts.to}: ${data?.id}`);
  }
}

export async function sendPasswordResetEmail(to: string, url: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Reset your QRNLab password',
    link: url,
    linkText: 'Reset password',
  });
}
