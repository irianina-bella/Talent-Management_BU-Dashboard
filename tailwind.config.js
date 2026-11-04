/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#071426', 900: '#0B1F3A', 800: '#13294B', 700: '#1E3A64', 600: '#2C4F80' },
        teal: { 700: '#0B7A78', 600: '#0F9490', 500: '#14A9A4', 100: '#D5F2F0', 50: '#EEF9F8' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(11,31,58,0.06), 0 1px 3px rgba(11,31,58,0.08)' },
    },
  },
  plugins: [],
};
