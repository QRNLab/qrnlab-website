/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly BETTER_AUTH_SECRET?: string;
  readonly BETTER_AUTH_URL?: string;
  readonly RESEND_API_KEY?: string;
  readonly MAIL_FROM?: string;
  readonly ADMIN_EMAILS?: string;
  readonly BUILD_API_URL?: string;
  readonly BUILD_TOKEN?: string;
  readonly DEPLOY_HOOK_URL?: string;
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
