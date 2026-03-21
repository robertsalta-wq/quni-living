/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** EmailJS — property enquiry (optional until you configure templates) */
  readonly VITE_EMAILJS_SERVICE_ID?: string
  readonly VITE_EMAILJS_PUBLIC_KEY?: string
  readonly VITE_EMAILJS_ENQUIRY_CONFIRMATION_TEMPLATE_ID?: string
  readonly VITE_EMAILJS_ENQUIRY_NOTIFY_TEMPLATE_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
