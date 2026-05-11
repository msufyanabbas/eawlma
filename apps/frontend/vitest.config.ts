import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror the Vite app-config alias so component imports like
    // `@/components/global/ListingCard` resolve identically in tests.
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    // Exclude Playwright + node_modules from Vitest's discovery — Playwright
    // owns ./e2e and uses its own test runner.
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', 'e2e/'],
    },
  },
});
