/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        midnight: '#0F172A',
        spark: '#F59E0B',
        rose: '#FB7185',
        glacier: '#F8FAFC',
        'slate-muted': '#94A3B8',
        'tinted-slate': '#8E9AAF',
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
    },
  },
  plugins: [],
};
