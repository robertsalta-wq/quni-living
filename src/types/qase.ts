import type { Json } from '../lib/database.types'

/** `qase_status` enum */
export type QaseStatus =
  | 'new'
  | 'open'
  | 'pending'
  | 'on_hold'
  | 'solved'
  | 'closed'

/** `qase_priority` enum */
export type QasePriority = 'urgent' | 'high' | 'normal' | 'low'

/** `qase_tickets.submitted_by_type` — app / email pipeline values; `admin` = staff-created ticket with no end-user submitter */
export type QaseSubmitterType = 'student' | 'landlord' | 'anonymous' | 'admin'

/** `qase_messages.author_type` */
export type QaseAuthorType = 'student' | 'landlord' | 'admin' | 'system'

/** `qase_fields.field_type` */
export type QaseFieldType = 'category' | 'priority' | 'custom'

/** `qase_tickets.received_via` */
export type QaseReceivedVia =
  | 'platform_form'
  | 'care@'
  | 'support@'
  | 'help@'

/** Subset of `bookings.status` for joined admin context */
export type QaseTicketContextBookingStatus =
  | 'pending'
  | 'pending_payment'
  | 'pending_confirmation'
  | 'awaiting_info'
  | 'confirmed'
  | 'active'
  | 'cancelled'
  | 'declined'
  | 'expired'
  | 'payment_failed'
  | 'completed'

/** `public.qase_tickets` row */
export type QaseTicket = {
  id: string
  ticket_number: number
  submitted_by_type: QaseSubmitterType
  submitted_by_id: string | null
  booking_id: string | null
  property_id: string | null
  status: QaseStatus
  priority: QasePriority
  category: string | null
  received_via: QaseReceivedVia
  subject: string
  ai_suggested_category: string | null
  ai_suggested_priority: string | null
  ai_draft_reply: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

/** `public.qase_messages` row */
export type QaseMessage = {
  id: string
  ticket_id: string
  author_id: string | null
  author_type: QaseAuthorType
  body: string
  is_internal_note: boolean
  created_at: string
}

/** `public.qase_fields` row */
export type QaseField = {
  id: string
  field_type: QaseFieldType
  field_key: string
  label: string
  options: Json | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export type QaseTicketInsert = {
  id?: string
  ticket_number?: number
  submitted_by_type: QaseSubmitterType
  submitted_by_id?: string | null
  booking_id?: string | null
  property_id?: string | null
  status?: QaseStatus
  priority?: QasePriority
  category?: string | null
  received_via: QaseReceivedVia
  subject: string
  ai_suggested_category?: string | null
  ai_suggested_priority?: string | null
  ai_draft_reply?: string | null
  created_at?: string
  updated_at?: string
  resolved_at?: string | null
}

export type QaseMessageInsert = {
  id?: string
  ticket_id: string
  author_id?: string | null
  author_type: QaseAuthorType
  body: string
  is_internal_note?: boolean
  created_at?: string
}

export type QaseFieldInsert = {
  id?: string
  field_type: QaseFieldType
  field_key: string
  label: string
  options?: Json | null
  is_active?: boolean
  sort_order?: number
  created_at?: string
}

/** Joined booking slice for admin ticket detail */
export type QaseTicketContextBooking = {
  id: string
  landlord_id: string | null
  student_id: string | null
  property_id: string | null
  status: QaseTicketContextBookingStatus
}

/** Joined property slice for admin ticket detail */
export type QaseTicketContextProperty = {
  id: string
  address: string | null
  landlord_id: string | null
}

/**
 * Submitter slice when joined from `student_profiles` or `landlord_profiles`.
 * - `id` — profile row PK (`student_profiles.id` / `landlord_profiles.id`)
 * - `user_id` — same as `auth.users.id` / `auth.uid()` on that profile row
 * - `role` — optional UI label (e.g. `'student' | 'landlord'`); not a DB column on those tables
 * Platform admins use `public.is_platform_admin()` (JWT email), not this shape.
 */
export type QaseTicketContextSubmitter = {
  id: string
  user_id: string
  full_name: string | null
  email: string | null
  role: string | null
}

/** Fully joined ticket for the admin Qase ticket view */
export type QaseTicketWithContext = QaseTicket & {
  booking?: QaseTicketContextBooking | null
  property?: QaseTicketContextProperty | null
  submitter?: QaseTicketContextSubmitter | null
  messages?: QaseMessage[]
}
