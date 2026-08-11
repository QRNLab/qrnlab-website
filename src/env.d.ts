/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly NEON_DATABASE_URL?: string;
  readonly BETTER_AUTH_SECRET?: string;
  readonly BETTER_AUTH_URL?: string;
  readonly RESEND_API_KEY?: string;
  readonly MAIL_FROM?: string;
  readonly ADMIN_EMAILS?: string;
  readonly GITHUB_TOKEN?: string;
  readonly GITHUB_REPO_OWNER?: string;
  readonly GITHUB_REPO_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    session?: {
      user: {
        id: string;
        name: string;
        email: string;
        role: string | null | undefined;
      };
    };
  }
}
