import * as Sentry from '@sentry/react'

export async function withSentryMonitoring<T>(label: string, fn: () => PromiseLike<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    Sentry.captureException(error, { tags: { operation: label } })
    throw error
  }
}
