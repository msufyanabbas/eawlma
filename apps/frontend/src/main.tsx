import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { HelmetProvider } from 'react-helmet-async';

import './i18n';
import './index.css';
import { EawlmaThemeProvider } from './theme/ThemeProvider';
import { queryClient } from './api/queryClient';
import { router } from './router';
import { initGA } from './utils/analytics';
import { initPostHog } from './lib/posthog';

initGA();
initPostHog();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <EawlmaThemeProvider>
          <RouterProvider router={router} />
        </EawlmaThemeProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
