import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves project sites from a sub-path (e.g. /Eventra-AI/).
// `VITE_BASE_PATH` lets the Pages build set it without affecting root hosting.
const base = process.env.VITE_BASE_PATH?.trim() || '/';

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: false,
    // Proxy API calls to the backend during development so the client can use
    // same-origin `/api` requests (CORS-free) and production parity is kept.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    pool: 'threads',
    maxWorkers: 1,
    minWorkers: 1,
    fileParallelism: false,
    isolate: false,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
