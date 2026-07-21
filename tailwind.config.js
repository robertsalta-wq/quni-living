/** @type {import('tailwindcss').Config} */

/**
 * Opacity-safe colour backed by a CSS variable in quni-design-tokens.css.
 * Tailwind v3 needs <alpha-value> (or equivalent) for `/30`-style modifiers;
 * plain `var(--token)` drops those utilities at build time.
 */
const quni = (token) =>
  `color-mix(in srgb, var(${token}) calc(100% * <alpha-value>), transparent)`

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
         * Property detail hero/gallery: import `SITE_CONTENT_MAX_CLASS` from `src/lib/site.ts` - keep in sync with this value.
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
         * Admin redesign tokens - keep in sync with `docs/admin-redesign/HANDOFF.md` §6.
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
         * Living Console / admin palette — aliases of `src/styles/quni-design-tokens.css`.
         * Hex lives only in the tokens file; these keys exist so existing `admin-*`
         * utilities keep working (including `/opacity` modifiers via color-mix).
         */
        'admin-coral': quni('--quni-coral'),
        'admin-coral-hover': quni('--quni-coral-hover'),
        'admin-coral-active': quni('--quni-coral-active'),
        'admin-coral-soft': quni('--quni-coral-soft'),
        'admin-cream': quni('--quni-cream'),
        'admin-cream-border': quni('--quni-cream-border'),
        'admin-input-border': quni('--quni-input-border'),
        'admin-navy': quni('--quni-navy'),
        'admin-ink': {
          DEFAULT: quni('--quni-ink'),
          2: quni('--quni-ink-2'),
          3: quni('--quni-ink-3'),
          4: quni('--quni-ink-4'),
          5: quni('--quni-ink-5'),
        },
        'admin-line': {
          DEFAULT: quni('--quni-line'),
          soft: quni('--quni-line-soft'),
        },
        'admin-surface': {
          1: quni('--quni-surface-1'),
          2: quni('--quni-surface-2'),
          3: quni('--quni-surface-3'),
        },
        'admin-success': {
          DEFAULT: quni('--quni-success'),
          fg: quni('--quni-success-strong'),
          bg: quni('--quni-success-bg'),
        },
        'admin-warning': {
          DEFAULT: quni('--quni-warning'),
          fg: quni('--quni-warning-fg'),
          bg: quni('--quni-warning-bg'),
        },
        'admin-danger': {
          DEFAULT: quni('--quni-danger'),
          strong: quni('--quni-danger-strong'),
          fg: quni('--quni-danger-fg'),
          bg: quni('--quni-danger-bg'),
        },
        'admin-info': {
          DEFAULT: quni('--quni-info'),
          fg: quni('--quni-info-fg'),
          bg: quni('--quni-info-bg'),
        },
        /** AI purple — booking review AI assessment (and nowhere decorative). */
        'admin-ai': {
          DEFAULT: quni('--quni-ai'),
          accent: quni('--quni-ai-accent'),
          dark: quni('--quni-ai-dark'),
          'dark-2': quni('--quni-ai-dark-2'),
          'dark-3': quni('--quni-ai-dark-3'),
          // Pre-composited tint/border tokens (already carry alpha).
          tint: 'var(--quni-ai-tint)',
          border: 'var(--quni-ai-border)',
        },
        /** Trust / eco green (marketing + property trust — not status success). */
        'admin-trust': {
          DEFAULT: quni('--quni-trust'),
          hover: quni('--quni-trust-hover'),
          soft: quni('--quni-trust-soft'),
          text: quni('--quni-trust-text'),
          bg: quni('--quni-trust-bg'),
        },
        /** Rust accent (compliance / HowItWorks — not coral). */
        'admin-rust': quni('--quni-rust'),
      },
      backgroundColor: {
        // Tint tokens already carry alpha; still use color-mix so `/50`-style modifiers emit.
        'admin-coral-tint': quni('--quni-coral-tint'),
        'admin-coral-tint-15': quni('--quni-coral-tint-15'),
        'admin-navy-tint': quni('--quni-navy-tint'),
        'admin-ai-tint': quni('--quni-ai-tint'),
      },
      borderColor: {
        // Fixed 30% coral border (named utility). Token border is 25%; keep 30% mix for parity with prior admin-coral-30.
        'admin-coral-30': 'color-mix(in srgb, var(--quni-coral) 30%, transparent)',
        'admin-ai-border': quni('--quni-ai-border'),
      },
      boxShadow: {
        'admin-card': 'var(--shadow-1)',
        'admin-card-hover': 'var(--shadow-2)',
        'admin-modal': 'var(--shadow-3)',
      },
      borderRadius: {
        'admin-sm': '6px',
        'admin-md': '10px',
        'admin-lg': '16px',
        'admin-pill': '999px',
      },
      keyframes: {
        'booking-drawer-slide': {
          from: { transform: 'translateX(24px)', opacity: '0.4' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'booking-drawer-slide': 'booking-drawer-slide .22s cubic-bezier(.2,0,0,1)',
      },
    },
  },
  plugins: [],
}
