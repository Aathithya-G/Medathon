/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        medical: {
          blue: '#0f4c81',
          teal: '#008080',
          light: '#e8f4f8',
        }
      }
    },
  },
  plugins: [],
}
