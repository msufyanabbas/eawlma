import { createTheme, ThemeOptions } from '@mui/material/styles';
import { darkPalette, lightPalette } from './palette';

export type Direction = 'ltr' | 'rtl';
export type Mode = 'light' | 'dark';

const baseTypography: ThemeOptions['typography'] = {
  fontFamily: ['Cairo', 'Inter', 'system-ui', 'sans-serif'].join(','),
  fontSize: 14,
  htmlFontSize: 16,
  h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 },
  h2: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.25 },
  h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3 },
  h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.35 },
  h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
  h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.45 },
  button: { textTransform: 'none', fontWeight: 600 },
};

const baseShape: ThemeOptions['shape'] = { borderRadius: 12 };

const componentOverrides: ThemeOptions['components'] = {
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: { borderRadius: 10, paddingInline: 16, paddingBlock: 8, fontWeight: 600 },
      sizeLarge: { paddingInline: 24, paddingBlock: 12, fontSize: '1rem' },
    },
  },
  MuiTextField: { defaultProps: { variant: 'outlined', fullWidth: true, size: 'medium' } },
  MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10 } } },
  MuiCard: { styleOverrides: { root: { borderRadius: 16 } } },
  MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
  MuiAppBar: { defaultProps: { elevation: 0, color: 'inherit' } },
  MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
  MuiChip: { styleOverrides: { root: { borderRadius: 8 } } },
};

export const buildTheme = (mode: Mode, direction: Direction) =>
  createTheme({
    direction,
    palette: mode === 'dark' ? darkPalette : lightPalette,
    typography: baseTypography,
    shape: baseShape,
    components: componentOverrides,
  });

export const defaultTheme = buildTheme('light', 'rtl');
