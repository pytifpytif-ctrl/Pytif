/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic tokens (channel triplets in index.css) so opacity modifiers work
        // and everything flips automatically under the `.dark` class.
        app: 'rgb(var(--app) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          soft: 'rgb(var(--surface-soft) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
        },
        line: 'rgb(var(--line) / <alpha-value>)',
        // Primary — deep electric blue (#1B4FDB at 600). Trust, stability.
        brand: {
          50: '#eef3fe',
          100: '#d9e4fd',
          200: '#b9ccfb',
          300: '#8aa9f7',
          400: '#547df1',
          500: '#2f5be7',
          600: '#1b4fdb',
          700: '#1740b8',
          800: '#183a95',
          900: '#193576',
          950: '#122150',
        },
        // Accent — clean emerald green (#00C896 at 500). Money arriving, success.
        accent: {
          50: '#e6fbf4',
          100: '#c5f5e5',
          200: '#8eebcd',
          300: '#4fdcb0',
          400: '#1ace97',
          500: '#00c896',
          600: '#00a87e',
          700: '#008566',
          800: '#036a52',
          900: '#045744',
          950: '#013228',
        },
        ink: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
          soft: 'rgb(var(--text-soft) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
        },
        // Neutral — off-white background / breathing room.
        canvas: 'rgb(var(--app) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(13,19,33,0.04), 0 8px 24px rgba(13,19,33,0.06)',
        float: '0 12px 40px rgba(27,79,219,0.18)',
        glow: '0 0 0 1px rgba(255,255,255,0.04), 0 18px 50px -12px rgba(27,79,219,0.45)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'draw-in': {
          '0%': { strokeDashoffset: 'var(--dash, 1000)' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        'slide-up': 'slide-up 0.45s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.22,1,0.36,1) both',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
        'draw-in': 'draw-in 1s ease-out forwards',
      },
    },
  },
  plugins: [],
}
