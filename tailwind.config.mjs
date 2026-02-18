/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        catalyst: {
          blue: '#3B82F6',
          green: '#22C55E',
          dark: '#000000',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Consolas', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        glass: '40px',
        'glass-strong': '60px',
      },
    },
  },
  plugins: [],
};
