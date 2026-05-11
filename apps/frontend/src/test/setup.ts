import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

// ----- i18n ----------------------------------------------------------------
// Bypass i18next entirely in unit tests — `t()` echoes back the key so
// assertions can still grep for it without needing real translations.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// ----- Router --------------------------------------------------------------
// TanStack Router needs DOM globals that jsdom provides, but the
// `<RouterProvider>` is overkill for component tests — replace useNavigate /
// useLocation / Link with cheap stubs.
vi.mock('@tanstack/react-router', async () => {
  return {
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '' }),
    useSearch: () => ({}),
    useParams: () => ({}),
    Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) =>
      React.createElement('a', { href: to, ...rest }, children),
  };
});

// ----- API client ----------------------------------------------------------
// Real axios calls would obviously not work in jsdom. Tests that need a
// specific mocked response should `vi.mocked(apiClient.get).mockResolvedValue(...)`.
vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  extractErrorMessage: (err: unknown) => (err as Error)?.message ?? 'error',
  unwrap: <T,>(payload: { data: T } | T): T =>
    (payload as { data: T }).data ?? (payload as T),
}));

// jsdom doesn't implement IntersectionObserver / ResizeObserver — both are
// referenced by MUI menus, infinite scroll, and avatars. Provide stubs.
class StubObserver {
  observe(): void {
    /* no-op */
  }
  unobserve(): void {
    /* no-op */
  }
  disconnect(): void {
    /* no-op */
  }
}
(globalThis as unknown as { IntersectionObserver: typeof StubObserver }).IntersectionObserver =
  StubObserver;
(globalThis as unknown as { ResizeObserver: typeof StubObserver }).ResizeObserver = StubObserver;

// `matchMedia` is read by MUI's responsive theme code. jsdom omits it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
