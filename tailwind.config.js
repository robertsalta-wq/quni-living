/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
        /** Public pricing page (see docs/mockups/pricing-page-mockup.html) */
        lora: ['"Lora"', 'Georgia', 'serif'],
        inter: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        /**
         * Admin redesign tokens — keep in sync with `docs/admin-redesign/HANDOFF.md` §6.
         * `font-admin-display` is Playfair Display, used ONLY for the Living Console hero.
         * `font-admin-serif` is Lora, used for pricing and editorial moments inside admin.
         * `font-admin-sans` is Inter, the default for every other admin surface.
         */
        'admin-display': ['"Playfair Display"', 'Georgia', 'serif'],
        'admin-serif': ['"Lora"', 'Georgia', 'serif'],
        'admin-sans': ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        /**
         * Admin redesign palette ("The Living Console") — keep in sync with
         * `docs/admin-redesign/HANDOFF.md` §6 and `prototype/colors_and_type.css`.
         * Prefixed with `admin-` so they never collide with existing brand tokens.
         */
        'admin-coral': '#FF6F61',
        'admin-coral-hover': '#F2604F',
        'admin-coral-active': '#CC4A3C',
        'admin-cream': '#FEF9E4',
        'admin-cream-border': '#E8E0CC',
        'admin-navy': '#1F2A44',
        'admin-ink': {
          DEFAULT: '#08060D',
          2: '#2A2433',
          3: '#4A4253',
          4: '#6B6375',
          5: '#908897',
        },
        'admin-line': {
          DEFAULT: '#E5E4E7',
          soft: '#EFEDE9',
        },
        'admin-surface': {
          1: '#FFFFFF',
          2: '#F8F6F1',
          3: '#F4F3EC',
        },
        'admin-success': {
          DEFAULT: '#1D9E75',
          fg: '#0F6E56',
          bg: '#E6F4EE',
        },
        'admin-warning': {
          DEFAULT: '#B7791F',
          fg: '#92400E',
          bg: '#FEF3C7',
        },
        'admin-danger': {
          DEFAULT: '#DC2626',
          fg: '#991B1B',
          bg: '#FEF2F2',
        },
        'admin-info': {
          DEFAULT: '#0369A1',
          fg: '#075985',
          bg: '#E0F2FE',
        },
      },
      backgroundColor: {
        'admin-coral-tint': 'rgba(255,111,97,0.08)',
        'admin-coral-tint-15': 'rgba(255,111,97,0.15)',
        'admin-navy-tint': 'rgba(31,42,68,0.08)',
      },
      borderColor: {
        'admin-coral-30': 'rgba(255,111,97,0.30)',
      },
      boxShadow: {
        'admin-card': '0 1px 2px rgba(8,6,13,.05), 0 1px 1px rgba(8,6,13,.03)',
        'admin-card-hover': '0 4px 12px rgba(8,6,13,.06), 0 2px 4px rgba(8,6,13,.04)',
        'admin-modal': '0 16px 32px rgba(8,6,13,.10), 0 4px 8px rgba(8,6,13,.05)',
      },
      borderRadius: {
        'admin-sm': '6px',
        'admin-md': '10px',
        'admin-lg': '16px',
        'admin-pill': '999px',
      },
    },
  },
  plugins: [],
}
