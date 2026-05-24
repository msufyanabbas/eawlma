import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL ?? 'http://192.168.1.125:3000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@eawlma/shared-types': resolve(__dirname, '../../packages/shared-types/src'),
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
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Function form — needed so subpath imports like
          // `@mui/icons-material/Home` land in the right chunk (the string
          // form only matches the package entry, leaving subpath icons in
          // the main index bundle).
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@mui/icons-material')) return 'mui-icons';
            if (id.includes('@mui/material') || id.includes('@emotion/')) return 'mui-core';
            if (id.includes('@sentry/')) return 'sentry-vendor';
            if (id.includes('@tanstack/react-router')) return 'router-vendor';
            if (id.includes('@tanstack/react-query')) return 'query-vendor';
            if (id.includes('@react-google-maps')) return 'maps-vendor';
            if (id.includes('framer-motion')) return 'motion-vendor';
            if (id.includes('recharts') || id.includes('d3-')) return 'charts-vendor';
            if (
              id.includes('react-hook-form') ||
              id.includes('@hookform/resolvers') ||
              id.includes('node_modules/zod')
            )
              return 'forms-vendor';
            if (
              id.includes('node_modules/i18next') ||
              id.includes('react-i18next')
            )
              return 'i18n-vendor';
            if (id.includes('react-pannellum') || id.includes('react-photo-view'))
              return 'media-vendor';
            if (
              id.includes('node_modules/axios') ||
              id.includes('node_modules/date-fns') ||
              id.includes('node_modules/zustand')
            )
              return 'utils-vendor';
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom'))
              return 'react-vendor';
            // Anything else from node_modules → catch-all vendor bucket so
            // the main `index` chunk only contains app code.
            return 'vendor';
          },
        },
      },
    },
  };
});
