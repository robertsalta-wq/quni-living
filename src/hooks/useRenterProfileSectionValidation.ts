import { useCallback, useState } from 'react'
import { buildRenterSectionSaveHint } from '../lib/renterProfileFieldValidation'

export function useRenterProfileSectionValidation(hintLabels: Record<string, string>) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [sectionError, setSectionError] = useState<string | null>(null)
  const [sectionSaveHint, setSectionSaveHint] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const applyValidationErrors = useCallback(
    (errors: Record<string, string>) => {
      setFieldErrors(errors)
      if (Object.keys(errors).length === 0) {
        setSectionError(null)
        setSectionSaveHint(null)
        return
      }
      const hint = buildRenterSectionSaveHint(errors, hintLabels)
      setSectionError(hint)
      setSectionSaveHint(hint)
    },
    [hintLabels],
  )

  const clearFieldError = useCallback(
    (field: string) => {
      setFieldErrors((prev) => {
        if (!prev[field]) return prev
        const next = { ...prev }
        delete next[field]
        if (Object.keys(next).length === 0) {
          setSectionError(null)
          setSectionSaveHint(null)
        } else {
          const hint = buildRenterSectionSaveHint(next, hintLabels)
          setSectionError(hint)
          setSectionSaveHint(hint)
        }
        return next
      })
    },
    [hintLabels],
  )

  const clearValidation = useCallback(() => {
    setFieldErrors({})
    setSectionError(null)
    setSectionSaveHint(null)
  }, [])

  const beginSaveAttempt = useCallback(() => {
    setSaveError(null)
    clearValidation()
  }, [clearValidation])

  return {
    fieldErrors,
    sectionError,
    sectionSaveHint,
    saveError,
    setSaveError,
    applyValidationErrors,
    clearFieldError,
    clearValidation,
    beginSaveAttempt,
  }
}
