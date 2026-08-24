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
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
  },
});
