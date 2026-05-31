import * as Sentry from '@sentry/react'

export type SubmitUserFeedbackInput = {
  feedback: string
  email?: string | null
  /** Optional tags for filtering in Sentry (e.g. source: 'admin'). */
  tags?: Record<string, string>
}

/**
 * Record ad-hoc user/product feedback in Sentry (not shown in the public UI).
 * For structured bug reports use Qase (`/admin/qase`, dashboards “Get support”).
 */
export function submitUserFeedback({ feedback, email, tags }: SubmitUserFeedbackInput): void {
  const text = feedback.trim()
  if (!text) return

  Sentry.captureMessage('User feedback: ' + text, {
    level: 'info',
    extra: { email: email?.trim() || undefined, feedback: text },
    tags,
  })
}
