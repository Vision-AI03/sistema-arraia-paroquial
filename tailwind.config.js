/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        arraia: {
          'brown-dark': '#3A2317',
          brown: '#5A3A22',
          gold: '#E8B923',
          'gold-dark': '#D4A017',
          red: '#C0392B',
          cream: '#FBF4E6',
          green: '#4E9A51',
          blue: '#2E86C1',
          orange: '#E67E22',
          yellow: '#E8B923',
        },
      },
      keyframes: {
        sway: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
      animation: {
        sway: 'sway 4.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
