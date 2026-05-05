import { PaletteOptions } from '@mui/material/styles';

// Brand palette — Saudi Lavender
//   primary       #6C63A6  — Saudi Lavender
//   primary dark  #4A4080  — Deep Lavender (gradient end)
//   primary light #9B94C9  — Light Lavender
//   secondary     #D4A843  — Warm Gold
//   accent        #2BBFBF  — Teal (exposed via theme.eawlma.accent)
//   hero bg       #1A1A2E  — Midnight (used for dark hero sections)
//   surface       #FAFAF8  — Warm White (page background in light mode)

export const lightPalette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: '#6C63A6',
    light: '#9B94C9',
    dark: '#4A4080',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#D4A843',
    light: '#E5BF6B',
    dark: '#A8842F',
    contrastText: '#1A1A2E',
  },
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#047857',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#B91C1C',
  },
  warning: {
    main: '#D4A843',
    light: '#E5BF6B',
    dark: '#A8842F',
  },
  info: {
    main: '#2BBFBF',
    light: '#5BCFCF',
    dark: '#1F8C8C',
  },
  grey: {
    50: '#FAFAF8',
    100: '#F2F2EE',
    200: '#E5E5DF',
    300: '#D1D1C9',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#1A1A2E',
  },
  background: {
    default: '#FAFAF8',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#1A1A2E',
    secondary: '#6B7280',
    disabled: '#9CA3AF',
  },
  divider: '#E5E5DF',
};

export const darkPalette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: '#9B94C9',
    light: '#BDB7DD',
    dark: '#6C63A6',
    contrastText: '#1A1A2E',
  },
  secondary: {
    main: '#E5BF6B',
    light: '#EFD191',
    dark: '#D4A843',
    contrastText: '#1A1A2E',
  },
  success: {
    main: '#34D399',
    light: '#6EE7B7',
    dark: '#10B981',
    contrastText: '#1A1A2E',
  },
  error: {
    main: '#F87171',
    light: '#FCA5A5',
    dark: '#EF4444',
  },
  warning: {
    main: '#E5BF6B',
    light: '#EFD191',
    dark: '#D4A843',
  },
  info: {
    main: '#5BCFCF',
    light: '#8EDFDF',
    dark: '#2BBFBF',
  },
  grey: {
    50: '#FAFAF8',
    100: '#F2F2EE',
    200: '#E5E5DF',
    300: '#D1D1C9',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#1A1A2E',
  },
  background: {
    default: '#1A1A2E',
    paper: '#272741',
  },
  text: {
    primary: '#FAFAF8',
    secondary: '#D1D1C9',
    disabled: '#6B7280',
  },
  divider: '#374151',
};

// Branded "hero" surface and accent — exposed via the theme so components can
// reach in via `theme.eawlma.hero` etc.
export const eawlmaBrand = {
  hero: '#1A1A2E',
  surface: '#FAFAF8',
  accent: '#2BBFBF',
  gold: '#D4A843',
  gradient: 'linear-gradient(135deg, #6C63A6 0%, #4A4080 100%)',
} as const;
