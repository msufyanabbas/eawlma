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
        // Saudi Lavender brand
        brand: {
          50: '#F2F0F8',
          100: '#E0DCEC',
          200: '#C6BFDD',
          300: '#9B94C9', // Light Lavender
          400: '#8079B6',
          500: '#6C63A6', // Primary
          600: '#5B5396',
          700: '#4A4080', // Deep Lavender
          800: '#372E60',
          900: '#1A1A2E', // Hero / midnight
        },
        // Warm Gold (secondary)
        gold: {
          50: '#FAF5E6',
          100: '#F2E5BA',
          200: '#E9D38B',
          300: '#E0C25C',
          400: '#D8B14F',
          500: '#D4A843', // Secondary
          600: '#B89033',
          700: '#A8842F',
          800: '#7A5F22',
          900: '#4C3B15',
        },
        // Teal accent
        accent: {
          50: '#E6FAFA',
          400: '#5BCFCF',
          500: '#2BBFBF', // Accent
          600: '#1F8C8C',
        },
        success: {
          400: '#34D399',
          500: '#10B981',
          600: '#047857',
        },
        danger: {
          400: '#F87171',
          500: '#EF4444',
          600: '#B91C1C',
        },
        // Warm neutrals
        ink: {
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
        soft: '0 1px 3px rgba(26,26,46,0.04), 0 1px 2px rgba(26,26,46,0.06)',
        card: '0 14px 28px rgba(26,26,46,0.06)',
        hero: '0 30px 60px rgba(26,26,46,0.18)',
        lavender: '0 10px 24px rgba(108,99,166,0.22)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6C63A6 0%, #4A4080 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(108,99,166,0.12) 0%, rgba(74,64,128,0.18) 100%)',
      },
    },
  },
  plugins: [],
};
