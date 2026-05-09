import { CacheProvider } from '@emotion/react';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { useEffect, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { buildTheme, type Direction, type LangScript } from './index';
import { createEmotionCache } from './emotion-cache';
import { useUiStore } from '@/store/ui.store';

/**
 * Theme + cache provider. Direction follows the active i18n language; mode
 * follows the persisted uiStore.themeMode. Both update the document root
 * (dir / data-theme) so global CSS can style accordingly.
 */
export function EawlmaThemeProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const themeMode = useUiStore((s) => s.themeMode);
  // Both Arabic and Urdu use RTL script.
  const lang = i18n.language ?? '';
  const direction: Direction =
    lang.startsWith('ar') || lang.startsWith('ur') ? 'rtl' : 'ltr';
  const script: LangScript = lang.startsWith('ur')
    ? 'urdu'
    : lang.startsWith('ar')
      ? 'arabic'
      : 'latin';

  const cache = useMemo(() => createEmotionCache(direction), [direction]);
  const theme = useMemo(
    () => buildTheme(themeMode, direction, script),
    [themeMode, direction, script],
  );

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
    document.documentElement.dataset.theme = themeMode;
  }, [direction, i18n.language, themeMode]);

  return (
    <CacheProvider value={cache}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </MuiThemeProvider>
    </CacheProvider>
  );
}
