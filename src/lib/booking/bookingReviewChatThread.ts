/**
 * Shared left/right chat-bubble thread builder for the booking review Messages section —
 * used by both the landlord page (commit 6) and the renter mirror (commit 8, read-only).
 */

export type BookingReviewChatMessageLike = {
  id: string
  sender_role: 'landlord' | 'student'
  message: string
  created_at: string
}

export type BookingReviewChatBubble = {
  key: string
  /** Renders on the "own" (right) side for the current viewer. */
  fromViewer: boolean
  name: string
  timeLabel: string
  text: string
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase() || '?'
}

export function formatBookingReviewChatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

/**
 * Builds the ordered bubble list for a viewer: the intro message (booking.student_message) first,
 * unless it is already duplicated verbatim in the thread, followed by the booking_messages history.
 */
export function buildBookingReviewChatThread(args: {
  viewerRole: 'landlord' | 'student'
  introMessage: string | null | undefined
  introCreatedAt: string | null | undefined
  otherPartyName: string
  messages: BookingReviewChatMessageLike[]
}): BookingReviewChatBubble[] {
  const intro = args.introMessage?.trim() ?? ''
  const introDuplicated = intro.length > 0 && args.messages.some((m) => m.message.trim() === intro)
  const items: BookingReviewChatBubble[] = []

  if (intro && !introDuplicated) {
    items.push({
      key: 'intro',
      fromViewer: args.viewerRole === 'student',
      name: args.viewerRole === 'student' ? 'You' : args.otherPartyName,
      timeLabel: args.introCreatedAt ? formatBookingReviewChatTimestamp(args.introCreatedAt) : '',
      text: intro,
    })
  }

  for (const m of args.messages) {
    if (!m.message.trim()) continue
    const fromViewer = m.sender_role === args.viewerRole
    items.push({
      key: m.id,
      fromViewer,
      name: fromViewer ? 'You' : args.otherPartyName,
      timeLabel: formatBookingReviewChatTimestamp(m.created_at),
      text: m.message.trim(),
    })
  }

  return items
}
