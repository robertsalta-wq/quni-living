import emailjs from '@emailjs/browser'
import { NOTIFY_QUNI } from './enquiryEmail'

export type EmailJsContactConfig =
  | { ok: true; serviceId: string; publicKey: string; templateId: string }
  | { ok: false; reason: string }

export function getEmailJsContactConfig(): EmailJsContactConfig {
  const serviceId = (import.meta.env.VITE_EMAILJS_SERVICE_ID ?? '').trim()
  const publicKey = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? '').trim()
  const templateId = (import.meta.env.VITE_EMAILJS_CONTACT_TEMPLATE_ID ?? '').trim()

  if (!serviceId || !publicKey || !templateId) {
    return {
      ok: false,
      reason:
        'Email is not configured. Add VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_PUBLIC_KEY, and VITE_EMAILJS_CONTACT_TEMPLATE_ID.',
    }
  }
  return { ok: true, serviceId, publicKey, templateId }
}

export type ContactEmailPayload = {
  senderName: string
  senderEmail: string
  subject: string
  message: string
}

/** Template should map To Email to hello@quni.com.au or use {{to_email}} / {{notify_to}}. */
export async function sendContactEmail(
  cfg: Extract<EmailJsContactConfig, { ok: true }>,
  p: ContactEmailPayload,
) {
  const common = { publicKey: cfg.publicKey }
  const params = {
    sender_name: p.senderName,
    sender_email: p.senderEmail,
    subject: p.subject,
    message: p.message,
    to_email: NOTIFY_QUNI,
    notify_to: NOTIFY_QUNI,
    admin_email: NOTIFY_QUNI,
    reply_to: p.senderEmail,
  }
  await emailjs.send(cfg.serviceId, cfg.templateId, params, common)
}
