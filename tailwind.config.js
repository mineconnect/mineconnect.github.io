/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-primary': '#020617',
        'primary': '#3b82f6',
        'accent': '#10b981',
        'danger': '#ef4444'
      }
    },
  },
  plugins: [],
}