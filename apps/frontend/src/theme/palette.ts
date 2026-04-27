import { PaletteOptions } from '@mui/material/styles';

export const lightPalette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: '#0F766E',
    light: '#14B8A6',
    dark: '#115E59',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#1E3A8A',
    light: '#3B82F6',
    dark: '#1E40AF',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#DC2626',
    light: '#EF4444',
    dark: '#991B1B',
  },
  warning: {
    main: '#D97706',
    light: '#F59E0B',
    dark: '#92400E',
  },
  info: {
    main: '#0284C7',
    light: '#0EA5E9',
    dark: '#075985',
  },
  success: {
    main: '#059669',
    light: '#10B981',
    dark: '#047857',
  },
  grey: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
  },
  background: {
    default: '#FAFAFA',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#18181B',
    secondary: '#52525B',
    disabled: '#A1A1AA',
  },
  divider: '#E4E4E7',
};

export const darkPalette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: '#2DD4BF',
    light: '#5EEAD4',
    dark: '#0F766E',
    contrastText: '#0B1418',
  },
  secondary: {
    main: '#60A5FA',
    light: '#93C5FD',
    dark: '#1E40AF',
  },
  background: {
    default: '#0B1418',
    paper: '#111B21',
  },
  text: {
    primary: '#F4F4F5',
    secondary: '#A1A1AA',
  },
  divider: '#27272A',
};
