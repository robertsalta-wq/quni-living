export function sendEmail(args: {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  cc?: string | string[]
  tags?: { name: string; value: string }[]
  /** Resend attachments; `content` is base64-encoded file bytes. */
  attachments?: { filename: string; content: string }[]
}): Promise<unknown>
