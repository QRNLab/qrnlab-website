import { env as cfEnv } from 'cloudflare:workers';

export const cf = cfEnv as unknown as Env;
