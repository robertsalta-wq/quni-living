import { useCallback, useRef } from 'react'

const PREFIX = 'quni:renter-draft:'

function draftKey(userId: string, section: string) {
  return `${PREFIX}${userId}:${section}`
}

export function readProfileSectionDraft<T>(userId: string, section: string): T | null {
  try {
    const raw = sessionStorage.getItem(draftKey(userId, section))
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeProfileSectionDraft<T>(userId: string, section: string, data: T): void {
  try {
    sessionStorage.setItem(draftKey(userId, section), JSON.stringify(data))
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearProfileSectionDraft(userId: string, section: string): void {
  try {
    sessionStorage.removeItem(draftKey(userId, section))
  } catch {
    /* ignore */
  }
}

/** Persist unsaved section edits across profile refetches and in-app navigation. */
export function useProfileSectionDraft(userId: string, section: string) {
  const draftActiveRef = useRef(false)
  const readyRef = useRef(false)
  const baselineRef = useRef<string | null>(null)

  const setBaseline = useCallback((data: unknown) => {
    baselineRef.current = JSON.stringify(data)
  }, [])

  const restoreDraft = useCallback(
    <T,>(apply: (draft: T) => void): boolean => {
      const draft = readProfileSectionDraft<T>(userId, section)
      if (!draft) return false
      apply(draft)
      baselineRef.current = JSON.stringify(draft)
      draftActiveRef.current = true
      readyRef.current = true
      return true
    },
    [userId, section],
  )

  /** Apply draft merged with profile; discard storage when merge equals profile (stale empty draft). */
  const restoreDraftMerged = useCallback(
    <T,>(
      fromProfile: T,
      merge: (draft: T, profile: T) => T,
      apply: (fields: T) => void,
    ): boolean => {
      const draft = readProfileSectionDraft<T>(userId, section)
      if (!draft) return false
      const merged = merge(draft, fromProfile)
      if (JSON.stringify(merged) === JSON.stringify(fromProfile)) {
        clearProfileSectionDraft(userId, section)
        return false
      }
      apply(merged)
      baselineRef.current = JSON.stringify(fromProfile)
      draftActiveRef.current = true
      readyRef.current = true
      writeProfileSectionDraft(userId, section, merged)
      return true
    },
    [userId, section],
  )

  const syncDraft = useCallback(
    (data: unknown) => {
      if (!readyRef.current) return
      const encoded = JSON.stringify(data)
      if (baselineRef.current === null || encoded === baselineRef.current) return
      draftActiveRef.current = true
      writeProfileSectionDraft(userId, section, data)
    },
    [userId, section],
  )

  const clearDraft = useCallback(() => {
    draftActiveRef.current = false
    clearProfileSectionDraft(userId, section)
  }, [userId, section])

  const shouldApplyProfile = useCallback(() => !draftActiveRef.current, [])

  const markReady = useCallback(() => {
    readyRef.current = true
  }, [])

  return {
    restoreDraft,
    restoreDraftMerged,
    syncDraft,
    setBaseline,
    clearDraft,
    shouldApplyProfile,
    markReady,
  }
}
