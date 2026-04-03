import { useEffect, useMemo, useState } from 'react'

const VISITOR_SESSION_KEY = 'quni_ai_visitor_session_id'

function generateVisitorSessionId(): string {
  // Prefer crypto UUID when available (modern browsers).
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  // Fallback: sufficiently unique for session-scoped abuse mitigation.
  return `v_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function readFromSessionStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const v = window.sessionStorage.getItem(VISITOR_SESSION_KEY)
    return v && v.trim() ? v.trim() : null
  } catch {
    return null
  }
}

function writeToSessionStorage(value: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(VISITOR_SESSION_KEY, value)
  } catch {
    // Ignore storage failures; the chat UI can still call without visitor rate limiting,
    // but it should degrade gracefully. We'll return null from the hook if not stored.
  }
}

export function useVisitorSessionId(): string | null {
  const initial = useMemo(() => readFromSessionStorage(), [])
  const [visitorSessionId, setVisitorSessionId] = useState<string | null>(initial)

  useEffect(() => {
    if (visitorSessionId) return
    const existing = readFromSessionStorage()
    if (existing) {
      setVisitorSessionId(existing)
      return
    }

    const created = generateVisitorSessionId()
    writeToSessionStorage(created)
    setVisitorSessionId(created)
  }, [visitorSessionId])

  return visitorSessionId
}

