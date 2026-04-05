import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0e0e12',
          secondary: '#16161d',
          tertiary: '#1c1c26',
          hover: '#22222e',
        },
        accent: {
          green: '#00ff88',
          red: '#ff3b3b',
          yellow: '#ffd60a',
          purple: '#7c3aed',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a0a0b0',
          tertiary: '#6b6b7b',
        },
        border: {
          DEFAULT: '#2a2a36',
          active: '#3a3a4a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Space Grotesk', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 255, 136, 0.4)' },
          '50%': { boxShadow: '0 0 12px 4px rgba(0, 255, 136, 0.1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out',
        'pulse-green': 'pulse-green 2s infinite',
        'fade-in': 'fade-in 0.3s ease',
      },
    },
  },
  plugins: [],
};

export default config;
