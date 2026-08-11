import { Resend } from 'resend';

const FROM_EMAIL = process.env.MAIL_FROM ?? 'QRNLab <onboarding@qrnlab.dev>';
let cached: Resend | null = null;

function getResend(): Resend | null {
  if (cached !== null) return cached;
  if (!process.env.RESEND_API_KEY) {
    cached = null;
    return cached;
  }
  cached = new Resend(process.env.RESEND_API_KEY);
  return cached;
}

export async function sendVerificationEmail(to: string, url: string): Promise<void> {
  const resend = getResend();
  const link = withCallbackUrl(url, '/account');
  if (!resend) {
    console.warn(`[mail] RESEND_API_KEY not set — verification link skipped for ${to}: ${link}`);
    return;
  }
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Verify your QRNLab account',
    html: `
      <p>Thanks for joining QRNLab!</p>
      <p>Verify your email address by clicking the link below:</p>
      <p><a href="${link}">Verify email</a></p>
      <p>If you did not request this, you can ignore this message.</p>
    `,
  });
}

function withCallbackUrl(url: string, callback: string): string {
  try {
    const u = new URL(url);
    const base = process.env.BETTER_AUTH_URL ?? 'http://localhost:4321';
    u.searchParams.set('callbackURL', `${base}${callback}`);
    return u.toString();
  } catch {
    return url;
  }
}

export async function sendPasswordResetEmail(to: string, url: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn(`[mail] RESEND_API_KEY not set — password reset skipped for ${to}: ${url}`);
    return;
  }
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Reset your QRNLab password',
    html: `
      <p>Someone requested a password reset for your QRNLab account.</p>
      <p><a href="${url}">Reset password</a></p>
      <p>If you did not request this, you can ignore this message.</p>
    `,
  });
}
