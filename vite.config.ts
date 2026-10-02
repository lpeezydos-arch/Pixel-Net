import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // BASE_PATH lets the same build serve from a domain root or a sub-path
    // such as GitHub Pages: BASE_PATH=/pixel-net/ npm run build
    base: env.BASE_PATH || '/',
    plugins: [react()],
    test: {
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  };
});
