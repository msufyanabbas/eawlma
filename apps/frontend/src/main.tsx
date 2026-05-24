import React from 'react';
import ReactDOM from 'react-dom/client';
import { Box, Button, Typography } from '@mui/material';
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
import { initSentry, Sentry } from './lib/sentry';

// Sentry first so it can capture any throws from the other initialisers.
initSentry();
initGA();
initPostHog();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

// Sentry's `ErrorBoundary` renders the fallback when a render throws and
// captures the exception. Wrapping just the router keeps the toast/dev-tools
// outside of the boundary so they survive a recoverable error.
const SentryBoundary = Sentry.ErrorBoundary;

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <EawlmaThemeProvider>
          <SentryBoundary
            fallback={({ resetError }) => (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100vh',
                  p: 4,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
                  Something went wrong
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Our team has been notified. Please try again.
                </Typography>
                <Button variant="contained" onClick={resetError}>
                  Try Again
                </Button>
              </Box>
            )}
          >
            <RouterProvider router={router} />
          </SentryBoundary>
        </EawlmaThemeProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
