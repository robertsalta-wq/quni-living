import type { ReactNode } from 'react'
import type { Database } from '../../lib/database.types'
import { isRoomType, ROOM_TYPE_LABELS } from '../../lib/listings'
import { formatLanguagesSpoken, normalizeLanguagesSpoken } from '../../lib/languagesSpoken'
import { LEASE_LENGTH_OPTIONS, isNonStudentAccommodationRoute } from '../../lib/studentOnboarding'
import { formatStudentOccupancyType } from '../../lib/studentOccupancyOptions'
import { Eyebrow } from './primitives'
import { AdminVerificationDocLink } from './AdminVerificationDocLink'
import { formatDate } from '../../pages/admin/adminUi'

type StudentRow = Database['public']['Tables']['student_profiles']['Row'] & {
  universities: { name: string } | null
}

const NOT_SPECIFIED = 'Not specified'

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  non_binary: 'Non-binary',
  prefer_not_say: 'Prefer not to say',
  other: 'Other',
}

function textOrNotSpecified(value: string | null | undefined): string {
  const t = value?.trim()
  return t || NOT_SPECIFIED
}

function formatEnumLabel(raw: string | null | undefined): string | null {
  const t = raw?.trim()
  if (!t) return null
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatStudyLevel(raw: string | null | undefined): string {
  return formatEnumLabel(raw) ?? NOT_SPECIFIED
}

function formatStudentType(raw: string | null | undefined): string {
  const t = raw?.trim()
  if (!t) return NOT_SPECIFIED
  const lower = t.toLowerCase()
  if (lower === 'domestic') return 'Domestic'
  if (lower === 'international') return 'International'
  return formatStudyLevel(t)
}

function formatGender(raw: string | null | undefined): string {
  const t = raw?.trim()
  if (!t) return NOT_SPECIFIED
  return GENDER_LABELS[t] ?? formatEnumLabel(t) ?? t
}

function formatYearOfStudy(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return NOT_SPECIFIED
  return String(value)
}

function formatBudgetRange(min: number | null | undefined, max: number | null | undefined): string {
  const hasMin = min != null && !Number.isNaN(Number(min))
  const hasMax = max != null && !Number.isNaN(Number(max))
  if (!hasMin && !hasMax) return NOT_SPECIFIED
  if (hasMin && hasMax) {
    return `$${Number(min).toLocaleString('en-AU', { maximumFractionDigits: 0 })} – $${Number(max).toLocaleString('en-AU', { maximumFractionDigits: 0 })} /wk`
  }
  if (hasMin) return `From $${Number(min).toLocaleString('en-AU', { maximumFractionDigits: 0 })} /wk`
  return `Up to $${Number(max).toLocaleString('en-AU', { maximumFractionDigits: 0 })} /wk`
}

function roomPreferenceLabel(pref: string | null | undefined): string {
  const t = pref?.trim()
  if (!t) return NOT_SPECIFIED
  if (isRoomType(t)) return ROOM_TYPE_LABELS[t]
  return formatEnumLabel(t) ?? t
}

function formatLeaseLengthPref(raw: string | null | undefined): string {
  const t = raw?.trim()
  if (!t) return NOT_SPECIFIED
  const opt = LEASE_LENGTH_OPTIONS.find((o) => o.value === t)
  return opt?.label ?? formatEnumLabel(t) ?? t
}

function formatMoveInFlexibility(raw: string | null | undefined): string {
  const t = raw?.trim()
  if (!t) return NOT_SPECIFIED
  if (t === 'exact') return 'Exact date'
  if (t === 'one_week') return '± 1 week'
  if (t === 'two_weeks') return '± 2 weeks'
  return formatEnumLabel(t) ?? t
}

function formatBooleanPref(
  value: boolean | null | undefined,
  yesLabel: string,
  noLabel: string,
): string {
  if (value === true) return yesLabel
  if (value === false) return noLabel
  return NOT_SPECIFIED
}

function formatGuarantor(has: boolean | null | undefined, name: string | null | undefined): string {
  if (has === true) return name?.trim() || 'Yes'
  if (has === false) return 'No'
  return NOT_SPECIFIED
}

function formatPreference(raw: string | null | undefined): string {
  return formatEnumLabel(raw) ?? NOT_SPECIFIED
}

function routeIntentLabel(route: StudentRow['accommodation_verification_route']): string {
  if (route === 'student') return 'Student'
  if (isNonStudentAccommodationRoute(route)) return 'Non-student'
  return NOT_SPECIFIED
}

function verificationProofLabel(verificationType: StudentRow['verification_type']): string {
  if (verificationType === 'student') return 'Verified (student)'
  if (verificationType === 'identity') return 'Verified (identity)'
  return 'Unverified'
}

function formatUniEmailVerification(row: StudentRow): string {
  if (!row.uni_email?.trim()) return NOT_SPECIFIED
  if (row.uni_email_verified) {
    const when = row.uni_email_verified_at ? formatDate(row.uni_email_verified_at) : 'date unknown'
    return `Verified · ${when}`
  }
  return 'Not verified'
}

function formatWorkEmailVerification(row: StudentRow): string {
  if (!row.work_email?.trim()) return NOT_SPECIFIED
  if (row.work_email_verified) {
    const when = row.work_email_verified_at ? formatDate(row.work_email_verified_at) : 'date unknown'
    return `Verified · ${when}`
  }
  return 'Not verified'
}

function formatLanguages(languages: string[] | null | undefined): string {
  const codes = normalizeLanguagesSpoken(languages)
  if (codes.length === 0) return NOT_SPECIFIED
  return formatLanguagesSpoken(codes)
}

function ProfileSection({ title, rows }: { title: string; rows: Array<[string, ReactNode]> }) {
  return (
    <div>
      <Eyebrow>{title}</Eyebrow>
      <KV rows={rows} />
    </div>
  )
}

function KV({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="mt-2.5 m-0 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2">
      {rows.map(([label, value], index) => (
        <div key={`${label}-${index}`} className="contents">
          <dt className="text-[12px] font-medium text-admin-ink-5">{label}</dt>
          <dd className="m-0 text-[13px] text-admin-ink-2 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Admin renter profile detail (display-only). Profile opens are audit-logged via
 * profileAccessLog; document file opens via {@link AdminVerificationDocLink}.
 */
export function AdminStudentVerificationDrawer({ row }: { row: StudentRow }) {
  const bio = row.bio?.trim()

  return (
    <div className="flex flex-col gap-5">
      <ProfileSection
        title="Identity"
        rows={[
          ['Full name', textOrNotSpecified(row.full_name)],
          ['Date of birth', row.date_of_birth ? formatDate(row.date_of_birth) : NOT_SPECIFIED],
          ['Nationality', textOrNotSpecified(row.nationality)],
          ['Gender', formatGender(row.gender)],
        ]}
      />

      <ProfileSection
        title="Contact"
        rows={[
          ['Email', textOrNotSpecified(row.email)],
          ['Phone', textOrNotSpecified(row.phone)],
          ['Uni email', textOrNotSpecified(row.uni_email)],
          ['Work email', textOrNotSpecified(row.work_email)],
        ]}
      />

      <ProfileSection
        title="Study"
        rows={[
          ['University', textOrNotSpecified(row.universities?.name)],
          ['Course', textOrNotSpecified(row.course)],
          ['Year of study', formatYearOfStudy(row.year_of_study)],
          ['Study level', formatStudyLevel(row.study_level)],
          ['Student type', formatStudentType(row.student_type)],
        ]}
      />

      <ProfileSection
        title="Housing"
        rows={[
          ['Budget', formatBudgetRange(row.budget_min_per_week, row.budget_max_per_week)],
          ['Room preference', roomPreferenceLabel(row.room_type_preference)],
          ['Occupancy', formatStudentOccupancyType(row.occupancy_type) ?? NOT_SPECIFIED],
          ['Move-in flexibility', formatMoveInFlexibility(row.move_in_flexibility)],
          [
            'Preferred move-in',
            row.preferred_move_in_date ? formatDate(row.preferred_move_in_date) : NOT_SPECIFIED,
          ],
          ['Preferred lease', formatLeaseLengthPref(row.preferred_lease_length)],
          ['Smoker', formatBooleanPref(row.is_smoker, 'Yes', 'No')],
          ['Pets', formatBooleanPref(row.has_pets, 'Has pets', 'No pets')],
          ['Parking', formatBooleanPref(row.needs_parking, 'Needs parking', 'No parking needed')],
          ['Bills', formatPreference(row.bills_preference)],
          ['Furnishing', formatPreference(row.furnishing_preference)],
        ]}
      />

      <ProfileSection
        title="Guarantor"
        rows={[
          ['Has guarantor', formatBooleanPref(row.has_guarantor, 'Yes', 'No')],
          ['Guarantor name', formatGuarantor(row.has_guarantor, row.guarantor_name)],
        ]}
      />

      <ProfileSection
        title="Emergency contact"
        rows={[
          ['Name', textOrNotSpecified(row.emergency_contact_name)],
          ['Phone', textOrNotSpecified(row.emergency_contact_phone)],
          ['Relationship', textOrNotSpecified(row.emergency_contact_relationship)],
          ['Email', textOrNotSpecified(row.emergency_contact_email)],
        ]}
      />

      <ProfileSection
        title="Other"
        rows={[
          ['Bio', bio || NOT_SPECIFIED],
          ['Languages', formatLanguages(row.languages_spoken)],
        ]}
      />

      <div>
        <Eyebrow>Verification</Eyebrow>
        <KV
          rows={[
            ['Verification type', verificationProofLabel(row.verification_type)],
            ['Onboarding route', routeIntentLabel(row.accommodation_verification_route)],
            ['Uni email verified', formatUniEmailVerification(row)],
            ['Work email verified', formatWorkEmailVerification(row)],
          ]}
        />

        <p className="mt-4 mb-0 text-[12px] leading-relaxed text-admin-ink-4">Verification documents</p>
        <p className="mt-1 mb-0 text-[12px] leading-relaxed text-admin-ink-4">
          Private files in Australian storage. Open links expire after one hour.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <AdminVerificationDocLink
            label="Photo ID"
            filePath={row.id_document_url}
            submittedAt={row.id_submitted_at}
            studentProfileId={row.id}
            documentType="id_document"
          />
          <AdminVerificationDocLink
            label="Proof of enrolment"
            filePath={row.enrolment_doc_url}
            submittedAt={row.enrolment_submitted_at}
            studentProfileId={row.id}
            documentType="enrolment_doc"
          />
          <AdminVerificationDocLink
            label="Supporting identity document"
            filePath={row.identity_supporting_doc_url}
            submittedAt={row.identity_supporting_submitted_at}
            studentProfileId={row.id}
            documentType="identity_supporting_doc"
          />
        </div>
      </div>
    </div>
  )
}
