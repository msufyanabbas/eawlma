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
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;

            if (id.includes('@sentry')) return 'sentry-vendor';

            if (
              id.includes('recharts') ||
              id.includes('d3-') ||
              id.includes('victory')
            )
              return 'charts-vendor';

            if (id.includes('@react-google-maps') || id.includes('googlemaps'))
              return 'maps-vendor';

            if (id.includes('i18next') || id.includes('react-i18next'))
              return 'i18n-vendor';

            if (id.includes('pannellum') || id.includes('react-photo-view'))
              return 'media-vendor';

            if (id.includes('@mui') || id.includes('@emotion'))
              return 'mui-vendor';

            if (
              id.includes('react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('scheduler')
            )
              return 'react-vendor';

            return 'vendor';
          },
        },
      },
    },
  };
});
