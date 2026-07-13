export function sendEmail(args: {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  cc?: string | string[]
  tags?: { name: string; value: string }[]
}): Promise<unknown>
