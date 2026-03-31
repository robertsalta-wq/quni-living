import emailjs from '@emailjs/browser'
import { NOTIFY_QUNI } from './enquiryEmail'

export type EmailJsLandlordLeadConfig =
  | { ok: true; serviceId: string; publicKey: string; templateId: string }
  | { ok: false; reason: string }

export function getEmailJsLandlordLeadConfig(): EmailJsLandlordLeadConfig {
  const serviceId = (import.meta.env.VITE_EMAILJS_SERVICE_ID ?? '').trim()
  const publicKey = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? '').trim()
  const templateId = (import.meta.env.VITE_EMAILJS_LANDLORD_LEAD_TEMPLATE_ID ?? '').trim()

  if (!serviceId || !publicKey || !templateId) {
    return {
      ok: false,
      reason:
        'Email is not configured. Add VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_PUBLIC_KEY, and VITE_EMAILJS_LANDLORD_LEAD_TEMPLATE_ID.',
    }
  }
  return { ok: true, serviceId, publicKey, templateId }
}

export type LandlordLeadEmailPayload = {
  name: string
  email: string
  phone: string
  suburb: string
  propertyCount: string
  message: string
}

/**
 * Notify hello@quni.com.au. Map template **To Email** to {{notify_to}} / {{to_email}} / {{admin_email}}.
 * Body vars: lead_name, lead_email, lead_phone, lead_suburb, property_count, lead_message (and aliases below).
 */
export async function sendLandlordLeadEmail(
  cfg: Extract<EmailJsLandlordLeadConfig, { ok: true }>,
  p: LandlordLeadEmailPayload,
) {
  const common = { publicKey: cfg.publicKey }
  const params = {
    lead_name: p.name,
    lead_email: p.email,
    lead_phone: p.phone,
    lead_suburb: p.suburb,
    property_count: p.propertyCount,
    lead_message: p.message,
    sender_name: p.name,
    sender_email: p.email,
    message: [
      `Landlord lead (partnerships page)`,
      `Name: ${p.name}`,
      `Email: ${p.email}`,
      `Phone: ${p.phone}`,
      `Suburb: ${p.suburb}`,
      `Properties: ${p.propertyCount}`,
      p.message ? `Message: ${p.message}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    notify_to: NOTIFY_QUNI,
    to_email: NOTIFY_QUNI,
    admin_email: NOTIFY_QUNI,
    recipient_email: NOTIFY_QUNI,
    reply_to: p.email,
  }
  await emailjs.send(cfg.serviceId, cfg.templateId, params, common)
}
