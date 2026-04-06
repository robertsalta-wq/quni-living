import * as Sentry from '@sentry/react'

export type ReportFormErrorOptions = {
  /** Only true for unexpected / server-side failures worth monitoring — not client-side validation. */
  sentry?: boolean
}

export function reportFormError(
  formName: string,
  fieldName: string,
  errorMessage: string,
  options?: ReportFormErrorOptions,
) {
  if (!options?.sentry) return
  Sentry.captureMessage(errorMessage, {
    level: 'warning',
    extra: { formName, fieldName, errorMessage },
  })
}
