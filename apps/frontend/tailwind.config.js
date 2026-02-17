/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A8A', // Matches mobile app
        secondary: '#64748B',
        accent: '#10B981',
      },
    },
  },
  plugins: [],
}
