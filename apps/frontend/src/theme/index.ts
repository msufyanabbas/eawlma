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

// Tajawal handles Arabic + Latin in a single face so we use it as the
// primary font for both. Inter is kept as a Latin-only fallback. Urdu gets
// Nastaliq because Tajawal is Naskh-only.
const STACK_DEFAULT = '"Tajawal", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const STACK_URDU = '"Gulzar", "Noto Nastaliq Urdu", serif';

const pickStack = (script: LangScript) => (script === 'urdu' ? STACK_URDU : STACK_DEFAULT);

const buildTypography = (
  _direction: Direction,
  script: LangScript = 'arabic',
): ThemeOptions['typography'] => {
  const stack = pickStack(script);
  // Urdu differs from Arabic only in the typeface — sizing and line-heights
  // stay identical so layouts don't reshuffle per locale.
  return {
    fontFamily: stack,
    // 15px base reads better in Tajawal than the prior 14px while staying
    // denser than the original 16px MUI default.
    fontSize: 15,
    htmlFontSize: 16,
    h1: { fontFamily: stack, fontSize: '2rem',    fontWeight: 800, lineHeight: 1.3 },
    h2: { fontFamily: stack, fontSize: '1.65rem', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontFamily: stack, fontSize: '1.4rem',  fontWeight: 700, lineHeight: 1.35 },
    h4: { fontFamily: stack, fontSize: '1.2rem',  fontWeight: 700, lineHeight: 1.4 },
    h5: { fontFamily: stack, fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.45 },
    h6: { fontFamily: stack, fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5 },
    subtitle1: { fontSize: '1rem',      fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontSize: '0.9rem',    fontWeight: 600, lineHeight: 1.5 },
    body1:     { fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.65 },
    body2:     { fontSize: '0.875rem',  fontWeight: 400, lineHeight: 1.65 },
    caption:   { fontSize: '0.8125rem', fontWeight: 400, lineHeight: 1.5 },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      lineHeight: 2,
    },
    button: {
      fontSize: '0.9375rem',
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
  };
};

const baseShape: ThemeOptions['shape'] = { borderRadius: 10 };

const buildComponents = (mode: Mode): ThemeOptions['components'] => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: mode === 'dark' ? darkPalette.background?.default : lightPalette.background?.default,
      },
    },
  },
  // (MuiTypography font-family is enforced via .MuiTypography-root in
  // index.css — the function-form override here used to send styles through
  // stylis-plugin-rtl + cssjanus, which couldn't handle the `::placeholder`
  // pseudo-element and crashed with "Cannot read properties of undefined
  // (reading 'push')" at runtime. Inheriting from the document handles it.)
  MuiButton: {
    defaultProps: { disableElevation: true, disableRipple: false },
    styleOverrides: {
      root: {
        borderRadius: 8,
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.875rem',
        boxShadow: 'none',
        lineHeight: 1.5,
        '&:hover': { boxShadow: 'none' },
      },
      sizeSmall: { fontSize: '0.8125rem', padding: '4px 12px' },
      sizeMedium: { padding: '8px 20px' },
      sizeLarge: { fontSize: '0.9375rem', padding: '10px 24px' },
    },
  },
  MuiTextField: {
    defaultProps: { variant: 'outlined', fullWidth: true, size: 'medium' },
  },
  MuiInputBase: {
    // No `&::placeholder` override here — cssjanus (used internally by
    // stylis-plugin-rtl) doesn't understand that pseudo-element and emits
    // CSS that crashes the RTL prefixer at runtime. Placeholder font-size
    // inherits from the input which already gets 0.875rem via theme.
    styleOverrides: {
      root: { fontSize: '0.875rem' },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 8,
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
          borderWidth: 1.5,
        },
      }),
      input: { padding: '10px 14px' },
      inputSizeSmall: { padding: '6px 12px' },
    },
  },
  MuiInputLabel: {
    styleOverrides: {
      root: { fontSize: '0.875rem' },
    },
  },
  MuiCard: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid',
        borderColor: 'rgba(0,0,0,0.09)',
        borderRadius: 10,
        backgroundImage: 'none',
        transition: 'all 0.15s ease',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(108,99,166,0.15)',
        },
      },
    },
  },
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 10,
      },
      elevation0: {
        boxShadow: 'none',
        border: 'none',
      },
    },
  },
  MuiAppBar: { defaultProps: { elevation: 0, color: 'inherit' } },
  MuiDialog: {
    styleOverrides: { paper: { borderRadius: 12 } },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontSize: '1.1rem',
        fontWeight: 700,
        padding: '16px 20px',
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        fontSize: '0.875rem',
        padding: '12px 20px',
      },
    },
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
          borderRadius: 6,
          fontWeight: 600,
          fontSize: '0.78rem',
          height: 28,
          letterSpacing: 0,
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
      sizeSmall: {
        height: 24,
        fontSize: '0.72rem',
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        fontSize: '0.875rem',
        minHeight: 36,
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      select: { fontSize: '0.875rem' },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        fontSize: '0.875rem',
        padding: '10px 16px',
      },
      head: {
        fontSize: '0.78rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#6b7280',
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        fontSize: '0.875rem',
        fontWeight: 600,
        textTransform: 'none',
        minWidth: 'auto',
        padding: '8px 16px',
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: ({ theme }) => ({
        backgroundColor: theme.palette.grey[900],
        fontSize: '0.78rem',
        borderRadius: 6,
      }),
      arrow: ({ theme }) => ({ color: theme.palette.grey[900] }),
    },
  },
  MuiBadge: {
    styleOverrides: {
      badge: {
        fontSize: '0.65rem',
        fontWeight: 700,
        minWidth: 16,
        height: 16,
        padding: '0 4px',
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        fontSize: '0.875rem',
        borderRadius: 8,
      },
    },
  },
  MuiBreadcrumbs: {
    styleOverrides: {
      root: { fontSize: '0.8125rem' },
      separator: { fontSize: '0.8125rem' },
      li: { fontSize: '0.8125rem' },
    },
  },
  MuiListItemText: {
    styleOverrides: {
      primary: { fontSize: '0.875rem' },
      secondary: { fontSize: '0.8rem' },
    },
  },
  MuiAccordionSummary: {
    styleOverrides: {
      root: { fontSize: '0.9rem', fontWeight: 600 },
    },
  },
  MuiStepLabel: {
    styleOverrides: {
      label: { fontSize: '0.8125rem' },
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
