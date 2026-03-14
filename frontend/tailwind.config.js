/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        oscar: {
          black: '#0A0A0A',
          gold: '#C5A44E',
          'gold-light': '#D4B96A',
          'gold-dark': '#A88B3D',
          white: '#FAF8F5',
          champagne: '#F5E6C8',
          'champagne-dark': '#E8D5A8',
          surface: '#141414',
        },
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
