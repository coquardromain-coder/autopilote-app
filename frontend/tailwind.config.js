/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Palette AutoPilote — dark premium
        ink: {
          900: '#0A0A0F',   // fond principal (noir profond)
          800: '#111118',   // fond secondaire (noir doux)
          700: '#16161F',
          600: '#1C1C28',
        },
        muted: '#8B8BA7',   // texte secondaire
        // Accent primaire (violet premium) — échelle complète + alias "brand"
        brand: {
          50: '#f1ecff',
          100: '#e4d9ff',
          200: '#c9b4ff',
          300: '#a98fff',
          400: '#8b6bff',
          500: '#6C47FF',
          600: '#5a35e6',
          700: '#4a2bc0',
          800: '#3a2299',
          900: '#2a1873',
          DEFAULT: '#6C47FF',
        },
        cyan: {
          DEFAULT: '#00D4FF',
          400: '#33ddff',
          500: '#00D4FF',
          600: '#00a8cc',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        // Halos lumineux
        glow: '0 0 24px rgba(108,71,255,0.35)',
        'glow-lg': '0 0 48px rgba(108,71,255,0.45)',
        'glow-cyan': '0 0 24px rgba(0,212,255,0.35)',
        card: '0 8px 32px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6C47FF 0%, #00D4FF 100%)',
        'brand-radial': 'radial-gradient(circle at 50% 0%, rgba(108,71,255,0.18), transparent 60%)',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-24px) translateX(12px)' },
        },
        gradientShift: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(108,71,255,0.5)' },
          '50%': { boxShadow: '0 0 0 10px rgba(108,71,255,0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out both',
        float: 'float 12s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
