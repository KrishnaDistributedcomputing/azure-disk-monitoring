/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Segoe UI'", "'Segoe UI Web (West European)'", '-apple-system', 'BlinkMacSystemFont', 'Roboto', "'Helvetica Neue'", 'sans-serif'],
      },
      colors: {
        azure: {
          50: '#f3f2f1',
          100: '#edebe9',
          200: '#e1dfdd',
          300: '#d2d0ce',
          400: '#c8c6c4',
          500: '#a19f9d',
          600: '#8a8886',
          700: '#605e5c',
          800: '#3b3a39',
          900: '#323130',
          950: '#292827',
          1000: '#1b1a19',
          blue: '#0078d4',
          'blue-hover': '#106ebe',
          'blue-pressed': '#005a9e',
          green: '#57a300',
          red: '#e81123',
          yellow: '#fce100',
          purple: '#8764b8',
        },
      },
    },
  },
  plugins: [],
};
