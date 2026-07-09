/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B1F3B',
          800: '#12294A',
          700: '#1A365D',
        },
        electric: {
          DEFAULT: '#2563EB',
          light: '#3B82F6',
          soft: '#EFF6FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,31,59,0.05), 0 4px 16px rgba(11,31,59,0.06)',
      },
    },
  },
  plugins: [],
};
