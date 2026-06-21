import { apiUrl } from './apiUrl'

export type JourneyEvent = {
  id: string
  created_at: string
  user_id: string | null
  email: string | null
  attempt_id: string | null
  property_id: string | null
  event_type: string
  step: string | null
  error_code: string | null
  http_status: number | null
  service_tier: string | null
  source: string
  metadata: Record<string, unknown>
}

export type UserTimelineAccount = {
  resolved: boolean
  user_id: string | null
  email: string | null
  role: 'student' | 'landlord' | 'admin' | null
  accommodation_verification_route: string | null
  verification_type: string | null
  onboarding_complete: boolean | null
  created_at: string | null
  student_profile_id: string | null
}

export type UserTimelineResponse = {
  query: { q: string; email: string | null; user_id: string | null }
  account: UserTimelineAccount
  events: JourneyEvent[]
  events_truncated?: boolean
}

export async function fetchUserTimeline(
  authHeader: string,
  q: string,
): Promise<UserTimelineResponse> {
  const res = await fetch(apiUrl(`/api/admin/user-timeline?q=${encodeURIComponent(q.trim())}`), {
    headers: { Authorization: authHeader },
  })
  const json = (await res.json()) as UserTimelineResponse & { error?: string }
  if (!res.ok) {
    throw new Error(json.error || 'Could not load timeline')
  }
  return json
}
