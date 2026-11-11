export function sendEmail(args: {
  to: string | string[]
  subject: string
  html: string
  /** Plain-text part. When set, Resend does not invent a link-only text body. */
  text?: string
  replyTo?: string
  cc?: string | string[]
  tags?: { name: string; value: string }[]
  /** Resend attachments; `content` is base64-encoded file bytes. */
  attachments?: { filename: string; content: string }[]
}): Promise<unknown>
