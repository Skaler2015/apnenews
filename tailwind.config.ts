import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#c8102e', // editorial red
          dark: '#9b0c23',
          light: '#e63950',
        },
        ink: {
          DEFAULT: '#141619',
          soft: '#3a3f47',
        },
      },
      fontFamily: {
        sans: ['var(--font-hind)', 'system-ui', 'Segoe UI', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      maxWidth: {
        content: '1240px',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '72ch',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
