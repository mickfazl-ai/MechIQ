/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1976D2', dark: '#1565C0', light: '#EBF3FC', border: '#BFDBFE' },
        success: { DEFAULT: '#15803D', bg: '#F0FDF4', border: '#86EFAC' },
        warning: { DEFAULT: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
        danger:  { DEFAULT: '#B91C1C', bg: '#FEF2F2', border: '#FCA5A5' },
        sidebar: '#1e293b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '3px',
        sm: '2px',
        md: '4px',
        lg: '6px',
      },
    },
  },
  plugins: [],
}
