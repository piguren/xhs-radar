import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import zip from 'vite-plugin-zip-pack';
import manifest from './manifest.config';

/** public/ 下的 HTML 会被 Vite 原样复制到 dist/ 根目录，与 Rollup 产出的 dist/public/*.html 重复且根上版本未打包。 */
function stripDuplicateRootHtmlFromPublic(): Plugin {
  return {
    name: 'strip-duplicate-root-html-from-public',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      for (const name of ['dashboard.html', 'popup.html'] as const) {
        const p = resolve(distDir, name);
        if (existsSync(p)) unlinkSync(p);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    tailwindcss(),
    zip({ outDir: 'release', outFileName: 'release.zip' }),
    stripDuplicateRootHtmlFromPublic(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
  build: {
    rollupOptions: {
      input: {
        dashboard: resolve(__dirname, 'public/dashboard.html'),
      },
    },
  },
});
