module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx,html}',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#9cc4b2',
        accent2: '#c98ca7'
      },
      boxShadow: {
        glass: '0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)'
      }
    }
  },
  plugins: [],
};
