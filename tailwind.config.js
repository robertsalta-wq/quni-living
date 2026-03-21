/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      maxWidth: {
        /** App content width cap (listings, property detail, header alignment) */
        site: '1200px',
      },
    },
  },
  plugins: [],
}
