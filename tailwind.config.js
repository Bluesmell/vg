/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'viimsi-blue': '#1e3a8a',
        'viimsi-green': '#4a5d23',
        'baltic-blue': '#0ea5e9',
        'estonian-flag': {
          'blue': '#0072ce',
          'black': '#000000',
          'white': '#ffffff'
        }
      },
      fontFamily: {
        'estonian': ['Arial', 'sans-serif']
      }
    },
  },
  plugins: [],
}