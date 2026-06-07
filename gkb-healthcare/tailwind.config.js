/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sakura:   '#FFB3C1',
        sky:      '#B8E8FC',
        mint:     '#C8FAD6',
        lavender: '#D4ADFC',
        cream:    '#FDEEA7',
        peach:    '#FECDAA',
        rose:     '#FF8FAB',
        paper:    '#FFF9FC',
        petal:    '#FFD6E7',
        fog:      '#E8F4FD',
        dusk:     '#C5B4E3',
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '1',    transform: 'scale(1)'    },
          '50%':     { opacity: '0.82', transform: 'scale(0.96)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
        wiggle: {
          '0%,100%': { transform: 'rotate(-3deg)' },
          '50%':     { transform: 'rotate(3deg)'  },
        },
      },
      animation: {
        float:        'float 3.5s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        shimmer:      'shimmer 2.5s linear infinite',
        wiggle:       'wiggle 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
