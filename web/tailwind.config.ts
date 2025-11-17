import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(0, 0%, 100%)',
        foreground: '#0f172a',
        muted: '#f8fafc',
        border: '#e2e8f0',
        card: '#ffffff',
        primary: {
          DEFAULT: '#0f172a',
          foreground: '#f8fafc'
        },
        success: '#15803d',
        warning: '#f59e0b',
        danger: '#dc2626'
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.35rem'
      }
    }
  },
  plugins: []
};

export default config;
