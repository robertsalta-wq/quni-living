import * as Sentry from '@sentry/react'

export function reportFormError(formName: string, fieldName: string, errorMessage: string) {
  Sentry.captureMessage(errorMessage, {
    level: 'warning',
    extra: { formName, fieldName, errorMessage },
  })
}
