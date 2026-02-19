/** @type {import('tailwindcss').Config} */
export default {
  content: {
    files: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    exclude: ['**/Newsletter.tsx']
  },
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        rose: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
        sage: {
          50: '#f6f8f7',
          100: '#e8eceb',
          200: '#d6dedc',
          300: '#ACC0B9',
          400: '#9bb0a9',
          500: '#8aa19a',
          600: '#78918a',
          700: '#647a74',
          800: '#536561',
          900: '#455452',
        }
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
