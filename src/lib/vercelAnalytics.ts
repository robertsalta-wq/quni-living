import { track } from '@vercel/analytics'

/** Fire-and-forget custom events for Vercel Web Analytics (Pro). */
export function trackVercelEvent(
  name: string,
  data?: Record<string, string | number | boolean | null>,
): void {
  try {
    track(name, data)
  } catch {
    /* analytics must never break the product path */
  }
}
