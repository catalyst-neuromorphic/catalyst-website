/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        catalyst: {
          blue: {
            DEFAULT: '#3B82F6',
            50: '#EFF6FF',
            100: '#DBEAFE',
            200: '#BFDBFE',
            300: '#93C5FD',
            400: '#60A5FA',
            500: '#3B82F6',
            600: '#2563EB',
            700: '#1D4ED8',
            800: '#1E40AF',
            900: '#1E3A8A',
            950: '#172554',
          },
          green: {
            DEFAULT: '#22C55E',
            50: '#F0FDF4',
            100: '#DCFCE7',
            200: '#BBF7D0',
            300: '#86EFAC',
            400: '#4ADE80',
            500: '#22C55E',
            600: '#16A34A',
            700: '#15803D',
            800: '#166534',
            900: '#14532D',
            950: '#052E16',
          },
          dark: '#0A0C10',
        },
        surface: {
          DEFAULT: '#0A0C10',
          50: '#0A0C10',
          100: '#111318',
          200: '#181B22',
          300: '#1F222B',
          400: '#272B35',
          border: '#2A2E38',
        },
      },
      fontFamily: {
        sans: ['Satoshi', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        glass: '40px',
        'glass-strong': '60px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
