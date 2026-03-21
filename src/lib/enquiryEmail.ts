import emailjs from '@emailjs/browser'

const NOTIFY_QUNI = 'hello@quni.com.au'

export type EmailJsEnquiryConfig =
  | {
      ok: true
      serviceId: string
      publicKey: string
      confirmationTemplateId: string
      notifyTemplateId: string
    }
  | { ok: false; reason: string }

/** Reads Vite env; templates should use these variable names (map in EmailJS UI). */
export function getEmailJsEnquiryConfig(): EmailJsEnquiryConfig {
  const serviceId = (import.meta.env.VITE_EMAILJS_SERVICE_ID ?? '').trim()
  const publicKey = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? '').trim()
  const confirmationTemplateId = (import.meta.env.VITE_EMAILJS_ENQUIRY_CONFIRMATION_TEMPLATE_ID ?? '').trim()
  const notifyTemplateId = (import.meta.env.VITE_EMAILJS_ENQUIRY_NOTIFY_TEMPLATE_ID ?? '').trim()

  if (!serviceId || !publicKey || !confirmationTemplateId || !notifyTemplateId) {
    return {
      ok: false,
      reason:
        'Email is not configured. Add VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_PUBLIC_KEY, VITE_EMAILJS_ENQUIRY_CONFIRMATION_TEMPLATE_ID, and VITE_EMAILJS_ENQUIRY_NOTIFY_TEMPLATE_ID.',
    }
  }
  return { ok: true, serviceId, publicKey, confirmationTemplateId, notifyTemplateId }
}

export type EnquiryEmailPayload = {
  propertyTitle: string
  senderName: string
  senderEmail: string
  message: string
}

/**
 * Confirmation → sender. In EmailJS, set template **To Email** to `{{to_email}}` (or `{{email}}` / `{{user_email}}`).
 * Notify → Quni. Set **To Email** to `hello@quni.com.au` or `{{notify_to}}` / `{{to_email}}` / `{{admin_email}}`.
 */
export async function sendEnquiryEmails(cfg: Extract<EmailJsEnquiryConfig, { ok: true }>, p: EnquiryEmailPayload) {
  const common = { publicKey: cfg.publicKey }

  const confirmParams = {
    property_title: p.propertyTitle,
    message: p.message,
    to_name: p.senderName,
    to_email: p.senderEmail,
    reply_to: p.senderEmail,
    from_name: p.senderName,
    from_email: p.senderEmail,
    // Aliases — EmailJS “To” must reference one of these or it stays empty
    email: p.senderEmail,
    user_email: p.senderEmail,
    recipient_email: p.senderEmail,
  }

  const notifyParams = {
    property_title: p.propertyTitle,
    sender_name: p.senderName,
    sender_email: p.senderEmail,
    message: p.message,
    notify_to: NOTIFY_QUNI,
    // Same keys many dashboards use for admin “To” (notify template only)
    to_email: NOTIFY_QUNI,
    admin_email: NOTIFY_QUNI,
    recipient_email: NOTIFY_QUNI,
  }

  await Promise.all([
    emailjs.send(cfg.serviceId, cfg.confirmationTemplateId, confirmParams, common),
    emailjs.send(cfg.serviceId, cfg.notifyTemplateId, notifyParams, common),
  ])
}

export { NOTIFY_QUNI }
