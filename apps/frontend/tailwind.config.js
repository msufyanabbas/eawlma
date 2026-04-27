/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Tailwind classes are prefixed `tw-` so they don't collide with MUI's
  // emotion-generated class names. Use as: <div className="tw-flex tw-gap-4">
  prefix: 'tw-',
  // Disable preflight so MUI's CssBaseline owns base styles.
  corePlugins: { preflight: false },
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#DBE6FF',
          200: '#B4C7FF',
          300: '#7B9EF5',
          400: '#3B6CE0',
          500: '#1B4FD8',
          600: '#143CA8',
          700: '#0E2D80',
          800: '#0A205C',
          900: '#06143A',
        },
        accent: {
          50: '#ECFDF5',
          400: '#34D399',
          500: '#10B981',
          600: '#047857',
        },
        amber: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#B45309',
        },
        slate: {
          50: '#F8FAFC',
          900: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['Inter', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        arabic: ['"IBM Plex Sans Arabic"', 'Cairo', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.06)',
        card: '0 14px 28px rgba(15,23,42,0.06)',
        hero: '0 30px 60px rgba(15,23,42,0.18)',
      },
    },
  },
  plugins: [],
};
