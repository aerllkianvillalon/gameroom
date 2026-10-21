import type { Config } from 'tailwindcss';

const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: c('ink-950'), 900: c('ink-900'), 800: c('ink-800'), 700: c('ink-700') },
        line: c('line'),
        paper: { DEFAULT: c('paper'), dim: c('paper-dim') },
        card: { red: c('card-red'), yellow: c('card-yellow'), green: c('card-green'), blue: c('card-blue') },
        plum: c('plum'),
      },
      fontFamily: {
        // Bricolage Grotesque: a characterful grotesque with ink traps; heavy weights feel like printed game boxes.
        display: ['"Bricolage Grotesque Variable"', '"Bricolage Grotesque"', '"Space Grotesk Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        lip: '0 4px 0 rgb(0 0 0 / 0.35)',
      },
    },
  },
} satisfies Config;
