// @ts-check
import 'dotenv/config';
// The @astrojs/netlify dev integration (edge-functions deno server) accumulates
// socket close listeners over a long dev session, tripping Node's
// MaxListenersExceededWarning. It's dev-only and benign; raise the limit so the
// dev server stays quiet. This process is never the production function.
process.setMaxListeners(0);
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  adapter: netlify(),
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { throwOnError: false, strict: false }]],
    }),
  },
});
