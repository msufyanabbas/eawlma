import { CacheProvider } from '@emotion/react';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { useEffect, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { buildTheme, type Direction, type Mode } from './index';
import { createEmotionCache } from './emotion-cache';

interface AqaratThemeProviderProps {
  children: ReactNode;
  mode?: Mode;
}

export function AqaratThemeProvider({ children, mode = 'light' }: AqaratThemeProviderProps) {
  const { i18n } = useTranslation();
  const direction: Direction = i18n.language === 'ar' ? 'rtl' : 'ltr';

  const cache = useMemo(() => createEmotionCache(direction), [direction]);
  const theme = useMemo(() => buildTheme(mode, direction), [mode, direction]);

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
  }, [direction, i18n.language]);

  return (
    <CacheProvider value={cache}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </MuiThemeProvider>
    </CacheProvider>
  );
}
