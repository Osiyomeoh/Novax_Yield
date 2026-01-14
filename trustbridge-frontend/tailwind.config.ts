import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: false,
  theme: {
    extend: {
      colors: {
        // Black and White theme
        'primary-blue': '#000000', // Pure black
        'primary-blue-light': '#333333', // Dark gray for hover states
        'primary-blue-dark': '#000000', // Pure black
        'white': '#FFFFFF',
        'black': '#000000',
        'off-black': '#0A0A0A',
        'gray-light': '#F5F5F5',
        'gray-medium': '#999999',
        'gray-dark': '#333333',
        'success': '#000000', // Black
        'warning': '#000000', // Black
        'error': '#000000', // Black
        'info': '#000000', // Black
        
        // Dark mode colors - Centrifuge-inspired
        'black': '#000000',
        'off-black': '#0F0F0F',
        'dark-gray': '#171717',
        'medium-gray': '#262626',
        'light-gray': '#404040',
        'off-white': '#FAFAFA',
        'pure-white': '#FFFFFF',
        
        // Light mode colors - Centrifuge-inspired
        'light-bg': '#FAFAFA', /* Off-white background */
        'light-surface': '#FAFAFA',
        'light-card': '#FFFFFF', /* Pure white for cards */
        'light-border': '#E5E5E5',
        'light-text': '#000000',
        'light-text-secondary': '#171717',
        'light-accent': '#000000',
        'light-accent-light': '#171717',
        
        // Semantic colors - White, Black, Blue theme
        'primary': {
          DEFAULT: '#000000',
          light: '#333333',
          dark: '#000000',
        },
        'secondary': {
          DEFAULT: '#FFFFFF',
          light: '#F5F5F5',
          dark: '#E5E5E5',
        },
        'accent': {
          DEFAULT: '#000000',
          light: '#333333',
          dark: '#000000',
        },
        'background': {
          DEFAULT: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },
        'text': {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },
        'border': {
          DEFAULT: 'var(--border-primary)',
          secondary: 'var(--border-secondary)',
          accent: 'var(--border-accent)',
        },
      },
      fontFamily: {
        'primary': ['Space Grotesk', 'sans-serif'],
        'secondary': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'rotate': 'rotate 20s linear infinite',
        'slide-in': 'slide-in 0.5s ease-out',
        'glitch': 'glitch 0.3s ease-in-out',
        'morph': 'morph 8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(180deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
        rotate: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        glitch: {
          '0%, 100%': { textShadow: '2px 2px #000000' },
          '25%': { textShadow: '-2px -2px #333333' },
          '50%': { textShadow: '2px -2px #000000' },
        },
        morph: {
          '0%, 100%': { borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' },
          '50%': { borderRadius: '70% 30% 30% 70% / 70% 70% 30% 30%' },
        },
      },
      boxShadow: {
        'neon': '0 0 10px rgba(0, 0, 0, 0.1)',
        'blue-glow': '0 0 10px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 10px rgba(0, 0, 0, 0.1)',
        'light-card': '0 1px 1px 0 rgba(0, 0, 0, 0.03)',
        'light-card-hover': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [
    function({ addUtilities }: any) {
      addUtilities({
        // Override dark hover states for buttons
        '.hover\\:bg-gray-100:hover': {
          'background-color': '#F5F5F5 !important',
          'color': '#000000 !important',
        },
        '.hover\\:bg-gray-200:hover': {
          'background-color': '#F5F5F5 !important',
          'color': '#000000 !important',
        },
      });
    },
  ],
} satisfies Config