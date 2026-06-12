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
      fontSize: {
        'caption': ['0.75rem', { lineHeight: '1.25', letterSpacing: '0.02em' }],
        'secondary': ['0.875rem', { lineHeight: '1.45' }],
        'body': ['1rem', { lineHeight: '1.65' }],
        'subheading': ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'heading': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'display': ['2rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
      },
      colors: {
        /* `base-*` is the dark-warm-gray surface scale. In v1 it was a static
           palette, which meant Tailwind utilities like `bg-base-700` never
           flipped with `[data-theme="light"]`. The fix is to repoint every
           stop to a CSS custom property defined on :root (dark) and
           [data-theme="light"] in `index.css`. Now the entire component tree
           auto-themes without rewriting call sites.

           Semantic intent mapping (preserves the visual feel of v1):
             900 → page bg         (var(--bg)           — deepest in dark, warm off-white in light)
             800 → deepest surface (var(--surface-0))  — used as a "darker than card" anchor
             700 → card bg         (var(--surface-1))  — main panel surface
             600 → nested control  (var(--surface-2))  — inputs, dropdowns, chips
             500 → hairline border (var(--surface-3) / --hairline)
             400 → deep text       (var(--text-faint)) — almost-invisible labels
             300 → muted text      (var(--text-faint) variant — strong muted)
             200 → secondary text  (var(--text-muted))
             100 → primary text    (var(--text-secondary))
             50  → display text    (var(--text-primary)) — headings, wordmark, kbd labels

           Two surfaces, two semantics: `bg-base-800` in the original palette
           acted as a "panel darker than card" anchor. In light mode we map it
           to `var(--surface-0)` (#FFFFFF, the page white), which is the
           correct "lightest surface" reading. Call sites that need a deeper
           card in light mode (e.g. nested panels) should switch to
           `bg-base-700`, which maps to `var(--surface-1)` (#F2EDE9). This
           preserves the visible step from page → card → nested. */
        base: {
          900: 'var(--bg)',
          800: 'var(--surface-0)',
          700: 'var(--surface-1)',
          600: 'var(--surface-2)',
          500: 'var(--hairline)',
          400: 'var(--text-faint)',
          300: 'var(--text-faint)',
          200: 'var(--text-muted)',
          100: 'var(--text-secondary)',
          50:  'var(--text-primary)',
        },
        accent: {
          sage: '#9cc4b2',
          'sage-light': '#b5d4c8',
          rose: '#c98ca7',
          beige: '#d5bbb1',
          coral: '#e76d83',
          blue: '#7da2f0',
          gold: '#f0c27a',
          /* Deep variants — for hover/pressed (shift hue AND lightness, not just alpha) */
          'sage-deep':   '#7da899',
          'sage-light-deep': '#95b9ab',
          'rose-deep':   '#a8758d',
          'beige-deep':  '#b89a90',
          'coral-deep':  '#c95a70',
          'blue-deep':   '#6186cf',
          'gold-deep':   '#d4a35a',
        },
        /* Semantic role colors — map to existing accents + new danger */
        role: {
          success: '#9cc4b2',   /* accent-sage  */
          info:    '#7da2f0',   /* accent-blue  */
          warning: '#f0c27a',   /* accent-gold  */
          danger:  '#e07a5f',   /* terracotta   */
          highlight: '#c98ca7', /* accent-rose  */
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
