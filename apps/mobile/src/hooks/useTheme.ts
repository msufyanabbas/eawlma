import { useUIStore } from '../store/ui.store';
import { COLORS } from '../theme';

export function useTheme() {
  const isDarkMode = useUIStore(s => s.isDarkMode);

  return {
    isDarkMode,
    colors: isDarkMode
      ? {
          ...COLORS,
          background: '#0F0F1A',
          surface: '#1A1A2E',
          surfaceVariant: '#252540',
          text: '#F1F5F9',
          textSecondary: '#94A3B8',
          border: '#2D2D4A',
          divider: '#1E1E35',
        }
      : COLORS,
  };
}
