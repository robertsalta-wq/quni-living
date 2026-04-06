export function sendEmail(args: {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}): Promise<unknown>
