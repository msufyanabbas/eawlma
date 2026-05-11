import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material';
import { HelmetProvider } from 'react-helmet-async';

/** Tiny MUI theme + react-query wrapper for component tests. Avoids pulling
 *  the full `<EawlmaThemeProvider>` (which loads fonts and uses RTL plumbing). */
const minimalTheme = createTheme({
  // Keep one custom token EawlmaThemeProvider exposes so components reading
  // `theme.eawlma.gold` / `.gradient` don't crash in tests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
(minimalTheme as unknown as { eawlma: Record<string, string> }).eawlma = {
  gold: '#f7b801',
  accent: '#6C63A6',
  gradient: 'linear-gradient(135deg,#6C63A6,#4A4080)',
};

interface Options extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const queryClient =
    options.queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={minimalTheme}>{children}</ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}
