export function sendEmail(args: {
  to: string | string[]
  subject: string
  html: string
}): Promise<unknown>
