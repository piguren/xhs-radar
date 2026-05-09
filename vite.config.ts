import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import zip from 'vite-plugin-zip-pack';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    tailwindcss(),
    zip({ outDir: 'release', outFileName: 'release.zip' }),
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
