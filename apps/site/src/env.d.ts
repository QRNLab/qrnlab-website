/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly BUILD_API_URL?: string;
  readonly BUILD_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
