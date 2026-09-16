import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--color-border))',
        input: 'hsl(var(--color-input))',
        ring: 'hsl(var(--color-ring))',
        background: 'hsl(var(--color-background))',
        foreground: 'hsl(var(--color-foreground))',
        primary: {
          DEFAULT: 'hsl(var(--color-primary))',
          foreground: 'hsl(var(--color-primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--color-secondary))',
          foreground: 'hsl(var(--color-secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--color-destructive))',
          foreground: 'hsl(var(--color-destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--color-muted))',
          foreground: 'hsl(var(--color-muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--color-accent))',
          foreground: 'hsl(var(--color-accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--color-popover))',
          foreground: 'hsl(var(--color-popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--color-card))',
          foreground: 'hsl(var(--color-card-foreground))',
        },
        main: '#FFDC58', // Bright yellow
        mainAccent: '#ffc800',
        mainAccent2: '#f6a313', // RGB 246,163,19
        overlay: 'rgba(0,0,0,0.8)',
        bg: '#FEF2E8',
        text: '#000',
        darkBg: '#374151',
        darkText: '#eeefe9',
        darkBorder: '#000',
      },
      borderRadius: {
        base: '8px',
      },
      boxShadow: {
        light: '1px 4px 0px 0px #000',
        dark: '1px 4px 0px 0px #000',
      },
      translate: {
        boxShadowX: '1px',
        boxShadowY: '4px',
        reverseBoxShadowX: '-1px',
        reverseBoxShadowY: '-4px',
      },
      fontFamily: {
        sans: ['Public Sans', 'Montserrat', 'sans-serif'],
        heading: ['Montserrat', 'Public Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        'large-title': ['64px', 'auto'],
        'medium-title': ['24px', 'auto'],
        'small-title': ['12px', 'auto'],
        'small-subtitle': ['10px', 'auto'],
      },
      animation: {
        marquee: 'marquee 5s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

export default config;
