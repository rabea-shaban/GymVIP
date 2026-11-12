/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gym: {
          primary: {
            DEFAULT: 'var(--color-primary)',
            light: 'var(--color-primary-light)',
            dark: 'var(--color-primary-dark)',
            hover: 'var(--color-primary-hover)',
            50: 'var(--color-primary-50)',
            100: 'var(--color-primary-100)',
            200: 'var(--color-primary-200)',
            500: 'var(--color-primary-500)',
            600: 'var(--color-primary-600)',
            700: 'var(--color-primary-700)',
          },
          black: 'var(--color-black)',
          white: 'var(--color-white)',
          background: 'var(--color-background)',
          surface: {
            DEFAULT: 'var(--color-surface)',
            hover: 'var(--color-surface-hover)',
            dark: 'var(--color-surface-card-dark)',
          },
          border: {
            DEFAULT: 'var(--color-border)',
            subtle: 'var(--color-border-subtle)',
            hover: 'var(--color-border-hover)',
            dark: 'var(--color-surface-dark-border)',
          },
          text: {
            DEFAULT: 'var(--color-text)',
            secondary: 'var(--color-text-secondary)',
            muted: 'var(--color-text-muted)',
            inverse: 'var(--color-text-inverse)',
          },
          success: {
            DEFAULT: 'var(--color-success)',
            bg: 'var(--color-success-bg)',
            text: 'var(--color-success-text)',
          },
          warning: {
            DEFAULT: 'var(--color-warning)',
            bg: 'var(--color-warning-bg)',
            text: 'var(--color-warning-text)',
          },
          error: {
            DEFAULT: 'var(--color-error)',
            bg: 'var(--color-error-bg)',
            text: 'var(--color-error-text)',
          },
          info: {
            DEFAULT: 'var(--color-info)',
            bg: 'var(--color-info-bg)',
            text: 'var(--color-info-text)',
          },
        },
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        display: ['Cairo', 'sans-serif'],
        body: ['IBM Plex Sans Arabic', 'Cairo', 'sans-serif'],
        ibm: ['IBM Plex Sans Arabic', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        gold: 'var(--shadow-gold)',
        'gold-focus': 'var(--shadow-gold-focus)',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
    },
  },
  plugins: [],
}
