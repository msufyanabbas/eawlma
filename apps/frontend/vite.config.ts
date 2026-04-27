import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL ?? 'http://localhost:3000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@aqarat/shared-types': resolve(__dirname, '../../packages/shared-types/src'),
      },
    },
    server: {
      port: 5173,
      strictPort: false,
      host: true,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: apiUrl,
          changeOrigin: true,
          ws: true,
          secure: false,
        },
      },
    },
    build: {
      target: 'es2022',
      sourcemap: mode !== 'production',
      // Maps + Framer Motion together push the main chunk past 500 KiB. Splitting
      // them into their own chunks keeps the initial bundle lean and lets the
      // browser cache them independently across page navigations.
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
            'router-vendor': ['@tanstack/react-router'],
            'query-vendor': ['@tanstack/react-query', 'axios'],
            'maps-vendor': ['@react-google-maps/api'],
            'motion-vendor': ['framer-motion'],
            'charts-vendor': ['recharts'],
            'forms-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          },
        },
      },
    },
  };
});
