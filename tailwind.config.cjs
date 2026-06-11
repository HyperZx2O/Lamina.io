module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx,html}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Crimson Pro', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        bangla: ['Hind Siliguri', 'sans-serif'],
      },
      colors: {
        base: {
          900: '#141110',
          800: '#1a1614',
          700: '#1e1a18',
          600: '#282422',
          500: '#343028',
          400: '#4a423e',
          300: '#6b5e58',
          200: '#9a8a82',
          100: '#c4b5ad',
          50: '#ede0d8',
        },
        accent: {
          sage: '#9cc4b2',
          'sage-light': '#b5d4c8',
          rose: '#c98ca7',
          beige: '#d5bbb1',
          coral: '#e76d83',
          blue: '#7da2f0',
          gold: '#f0c27a',
        },
      },
      boxShadow: {
        glass: '0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        card: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
        glow: '0 0 20px rgba(156,196,178,0.15)',
      },
      borderRadius: {
        DEFAULT: '12px',
      },
      backdropBlur: {
        glass: '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        'progress': 'progress 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        skeleton: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
    },
  },
  plugins: [],
};
