import { env as cfEnv } from 'cloudflare:workers';

export const cf = cfEnv as unknown as Env;
export const env = cfEnv as unknown as Env;
export const getEnv = () => cfEnv as unknown as Env;
