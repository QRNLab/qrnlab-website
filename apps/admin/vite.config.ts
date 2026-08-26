import { fileRoutes } from 'filesystem-routing/vite';
import { defineConfig } from 'vite';
import solid from '@solidjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    solid({ start: true, extensions: ['.jsx', '.tsx'] }),
    fileRoutes({ types: true }),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    // The API lives in the Cloudflare Worker (wrangler dev). Proxy /api to it
    // so the SPA can talk to the same origin during development. Run the API
    // with: pnpm --filter @qrnlab/admin dev:api
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
  },
});
