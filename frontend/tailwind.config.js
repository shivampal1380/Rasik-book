/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7f0',
          100: '#d7ecdd',
          200: '#b0d9bd',
          300: '#82bf98',
          400: '#54a373',
          500: '#358757',
          600: '#276b44',
          700: '#1f5436',
          800: '#1a442d',
          900: '#143721',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};