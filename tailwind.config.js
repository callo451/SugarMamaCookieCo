/** @type {import('tailwindcss').Config} */
export default {
  content: {
    files: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    exclude: ['**/Newsletter.tsx']
  },
  theme: {
    extend: {
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
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg) scale(1)' },
          '25%': { transform: 'translateY(-20px) rotate(90deg) scale(1.1)' },
          '50%': { transform: 'translateY(0) rotate(180deg) scale(1)' },
          '75%': { transform: 'translateY(20px) rotate(270deg) scale(0.9)' },
        },
        sprinkle: {
          '0%': { 
            transform: 'translateY(-20vh) rotate(0deg)',
            opacity: '0'
          },
          '10%': { 
            opacity: '0.5'
          },
          '90%': { 
            opacity: '0.5'
          },
          '100%': { 
            transform: 'translateY(120vh) rotate(360deg)',
            opacity: '0'
          },
        },
        pulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.3' },
          '50%': { transform: 'scale(1.1)', opacity: '0.4' },
        },
        sparkle: {
          '0%, 100%': { 
            transform: 'scale(0) rotate(0deg)',
            opacity: '0'
          },
          '50%': { 
            transform: 'scale(1) rotate(180deg)',
            opacity: '0.6'
          },
        },
      },
      animation: {
        float: 'float 20s ease-in-out infinite',
        sprinkle: 'sprinkle 15s linear infinite',
        pulse: 'pulse 5s ease-in-out infinite',
        sparkle: 'sparkle 3s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
