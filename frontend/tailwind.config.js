/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg0:     '#050810',
        bg1:     '#080d1a',
        bg2:     '#0d1426',
        bg3:     '#111d35',
        card:    '#0a1020',
        border:  '#1a2540',
        accent:  '#00d4ff',
        accent2: '#7c3aed',
        success: '#10b981',
        warning: '#f59e0b',
        danger:  '#ef4444',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
