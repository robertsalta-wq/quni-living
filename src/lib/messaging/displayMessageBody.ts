import { maskContactInfo } from './maskContactInfo.js'

export type DisplayMessageBodyOptions = {
  contactUnlocked: boolean
  isAdmin?: boolean
  /** When false, show raw body for participants (logging still runs on insert). */
  maskingEnabled?: boolean
}

/** Participant-facing body: full text when unlocked/admin or masking disabled; else masked. */
export function displayMessageBody(body: string, opts: DisplayMessageBodyOptions): string {
  if (opts.isAdmin || opts.contactUnlocked || opts.maskingEnabled === false) {
    return body
  }
  return maskContactInfo(body).maskedBody
}

export function previewMessageBody(body: string, opts: DisplayMessageBodyOptions, maxLen = 200): string {
  const display = displayMessageBody(body, opts)
  if (display.length <= maxLen) return display
  return `${display.slice(0, maxLen - 1)}…`
}
