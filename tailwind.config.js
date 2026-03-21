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
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        /** Footer body text (reference design); rest of app keeps default sans */
        footer: ['"Open Sans"', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
