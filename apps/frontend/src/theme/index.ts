import { alpha, createTheme, ThemeOptions } from '@mui/material/styles';
import { eawlmaBrand, darkPalette, lightPalette } from './palette';

export type Direction = 'ltr' | 'rtl';
export type Mode = 'light' | 'dark';
export type LangScript = 'latin' | 'arabic' | 'urdu';

declare module '@mui/material/styles' {
  interface Theme {
    eawlma: {
      hero: string;
      surface: string;
      accent: string;
      gold: string;
      gradient: string;
    };
  }
  interface ThemeOptions {
    eawlma?: {
      hero?: string;
      surface?: string;
      accent?: string;
      gold?: string;
      gradient?: string;
    };
  }
}

const headingStackLatin = ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'].join(',');
const bodyStackLatin = ['Inter', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'].join(',');
const stackArabic = ['Tajawal', '"IBM Plex Sans Arabic"', 'Cairo', 'system-ui', 'sans-serif'].join(',');
// Urdu stack — Noto Nastaliq Urdu primary, Mehr Nastaliq self-hosted fallback for richer Nastaleeq.
const stackUrdu = ['"Noto Nastaliq Urdu"', '"Mehr Nastaliq"', 'serif'].join(',');

const pickStack = (script: LangScript) => {
  if (script === 'arabic') return stackArabic;
  if (script === 'urdu') return stackUrdu;
  return bodyStackLatin;
};
const pickHeadingStack = (script: LangScript) => {
  if (script === 'arabic') return stackArabic;
  if (script === 'urdu') return stackUrdu;
  return headingStackLatin;
};

const buildTypography = (
  direction: Direction,
  script: LangScript = direction === 'rtl' ? 'arabic' : 'latin',
): ThemeOptions['typography'] => {
  const stack = pickStack(script);
  const headingStack = pickHeadingStack(script);
  // Nastaleeq needs more vertical space than Naskh/Latin but the same glyph
  // size — bumping fontSize made everything feel oversized.
  const isUrdu = script === 'urdu';
  return {
    fontFamily: stack,
    fontSize: 14,
    htmlFontSize: 16,
    h1: {
      fontFamily: headingStack,
      fontSize: '2.75rem',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      lineHeight: 1.15,
    },
    h2: {
      fontFamily: headingStack,
      fontSize: '2.25rem',
      fontWeight: 700,
      letterSpacing: '-0.018em',
      lineHeight: 1.2,
    },
    h3: {
      fontFamily: headingStack,
      fontSize: '1.75rem',
      fontWeight: 700,
      letterSpacing: '-0.016em',
      lineHeight: 1.25,
    },
    h4: {
      fontFamily: headingStack,
      fontSize: '1.375rem',
      fontWeight: 700,
      letterSpacing: '-0.012em',
      lineHeight: 1.3,
    },
    h5: {
      fontFamily: headingStack,
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontFamily: headingStack,
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.45,
    },
    subtitle1: { fontWeight: 500, ...(isUrdu ? { lineHeight: 1.8 } : {}) },
    subtitle2: { fontWeight: 600, ...(isUrdu ? { lineHeight: 1.8 } : {}) },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: isUrdu ? 1.8 : 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: isUrdu ? 1.8 : 1.55,
    },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    overline: { fontWeight: 600, letterSpacing: '0.08em' },
  };
};

const baseShape: ThemeOptions['shape'] = { borderRadius: 12 };

const buildComponents = (mode: Mode): ThemeOptions['components'] => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: mode === 'dark' ? darkPalette.background?.default : lightPalette.background?.default,
      },
    },
  },
  MuiButton: {
    defaultProps: { disableElevation: true, disableRipple: false },
    styleOverrides: {
      root: ({ ownerState, theme }) => ({
        borderRadius: 10,
        paddingInline: 18,
        paddingBlock: 9,
        fontWeight: 600,
        boxShadow: 'none',
        transition: 'transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease',
        '&:hover': {
          boxShadow: ownerState.variant === 'contained' ? `0 8px 18px ${alpha(theme.palette.primary.main, 0.22)}` : 'none',
          transform: 'translateY(-1px)',
        },
        '&:active': { transform: 'translateY(0)' },
      }),
      sizeLarge: { paddingInline: 26, paddingBlock: 13, fontSize: '1rem' },
      sizeSmall: { paddingInline: 12, paddingBlock: 6, fontSize: '0.8125rem' },
      containedPrimary: ({ theme }) => ({
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        '&:hover': {
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
        },
      }),
    },
  },
  MuiTextField: {
    defaultProps: { variant: 'outlined', fullWidth: true, size: 'medium' },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 10,
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
          borderWidth: 1.5,
        },
      }),
    },
  },
  MuiCard: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 16,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
        backgroundImage: 'none',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: alpha(theme.palette.primary.main, 0.3),
          boxShadow: '0 14px 28px rgba(15, 23, 42, 0.06)',
        },
      }),
    },
  },
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: { root: { backgroundImage: 'none', borderRadius: 14 } },
  },
  MuiAppBar: { defaultProps: { elevation: 0, color: 'inherit' } },
  MuiDialog: {
    styleOverrides: { paper: { borderRadius: 16 } },
  },
  MuiChip: {
    defaultProps: { size: 'small' },
    styleOverrides: {
      root: ({ ownerState, theme }) => {
        const baseColor =
          ownerState.color && ownerState.color !== 'default'
            ? theme.palette[ownerState.color as 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info']
            : null;
        return {
          borderRadius: 999,
          fontWeight: 600,
          letterSpacing: 0,
          height: 26,
          paddingInline: 4,
          ...(ownerState.variant === 'filled' && baseColor
            ? {
                backgroundColor: alpha(baseColor.main, 0.12),
                color: baseColor.dark,
                border: `1px solid ${alpha(baseColor.main, 0.2)}`,
              }
            : {}),
        };
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: ({ theme }) => ({
        backgroundColor: theme.palette.grey[900],
        fontSize: 12,
        borderRadius: 8,
      }),
      arrow: ({ theme }) => ({ color: theme.palette.grey[900] }),
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        color: theme.palette.primary.main,
        fontWeight: 700,
      }),
    },
  },
  MuiSkeleton: {
    defaultProps: { animation: 'wave' },
  },
});

export const buildTheme = (mode: Mode, direction: Direction, script?: LangScript) =>
  createTheme({
    direction,
    palette: mode === 'dark' ? darkPalette : lightPalette,
    typography: buildTypography(direction, script),
    shape: baseShape,
    components: buildComponents(mode),
    eawlma: {
      hero: eawlmaBrand.hero,
      surface: eawlmaBrand.surface,
      accent: eawlmaBrand.accent,
      gold: eawlmaBrand.gold,
      gradient: eawlmaBrand.gradient,
    },
  });

export const defaultTheme = buildTheme('light', 'rtl', 'arabic');
