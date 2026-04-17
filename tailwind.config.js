/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#0d1110',
        },
        teal: {
          light: '#9dd9cf',
          dark: '#2d5a52',
        },
      },
      maxWidth: {
        /**
         * App content width cap (listings, property detail, header alignment).
         * Property detail hero/gallery: import `SITE_CONTENT_MAX_CLASS` from `src/lib/site.ts` — keep in sync with this value.
         */
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
