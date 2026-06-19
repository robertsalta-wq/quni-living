import { captureSentryMessageEdge } from './sentryEdgeCapture.js'

export type AiRoute =
  | 'suggest-pricing'
  | 'generate-description'
  | 'draft-enquiry-reply'
  | 'proofread-text'
  | 'student-assessment'
  | 'chat'
  | 'health'

/** Best-effort Sentry event for AI route failures (Edge + Node serverless). */
export async function reportAiFailure(
  route: AiRoute,
  reason: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  await captureSentryMessageEdge(`AI ${route}: ${reason}`, {
    ai_route: route,
    ...extra,
  })
}
