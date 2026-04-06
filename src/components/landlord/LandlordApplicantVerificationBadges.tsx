import { formatDate } from '../../pages/admin/adminUi'

export type LandlordSeenStudentVerification = {
  verification_type: 'student' | 'identity' | 'none' | null
  accommodation_verification_route: 'student' | 'non_student' | null
  uni_email_verified: boolean | null
  uni_email_verified_at: string | null
  work_email_verified: boolean | null
  work_email_verified_at: string | null
  /** Derived without selecting document URLs (see id_submitted_at on profile). */
  id_provided: boolean
  id_submitted_at: string | null
  enrolment_provided: boolean
  enrolment_submitted_at: string | null
  identity_supporting_provided: boolean
  identity_supporting_submitted_at: string | null
}

const pillClass =
  'inline-flex max-w-full min-w-0 items-center gap-0.5 whitespace-normal break-words rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-emerald-900'

/**
 * Landlord queries must not select `id_document_url` / `enrolment_doc_url`.
 * Upload flow sets `id_submitted_at` / `enrolment_submitted_at` together with those paths,
 * so non-null timestamps match "document on file" the same as `url is not null`.
 */
export function buildLandlordVerificationFromProfile(row: {
  verification_type?: 'student' | 'identity' | 'none' | null
  accommodation_verification_route?: 'student' | 'non_student' | null
  uni_email_verified?: boolean | null
  uni_email_verified_at?: string | null
  work_email_verified?: boolean | null
  work_email_verified_at?: string | null
  id_submitted_at?: string | null
  enrolment_submitted_at?: string | null
  identity_supporting_submitted_at?: string | null
} | null | undefined): LandlordSeenStudentVerification | null {
  if (!row) return null
  return {
    verification_type: row.verification_type ?? 'none',
    accommodation_verification_route: row.accommodation_verification_route ?? null,
    uni_email_verified: row.uni_email_verified ?? null,
    uni_email_verified_at: row.uni_email_verified_at ?? null,
    work_email_verified: row.work_email_verified ?? null,
    work_email_verified_at: row.work_email_verified_at ?? null,
    id_provided: row.id_submitted_at != null && String(row.id_submitted_at).trim() !== '',
    id_submitted_at: row.id_submitted_at ?? null,
    enrolment_provided:
      row.enrolment_submitted_at != null && String(row.enrolment_submitted_at).trim() !== '',
    enrolment_submitted_at: row.enrolment_submitted_at ?? null,
    identity_supporting_provided:
      row.identity_supporting_submitted_at != null &&
      String(row.identity_supporting_submitted_at).trim() !== '',
    identity_supporting_submitted_at: row.identity_supporting_submitted_at ?? null,
  }
}

const tierPillClass =
  'inline-flex max-w-full min-w-0 items-center gap-0.5 whitespace-normal break-words rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-indigo-900 ring-1 ring-indigo-200/80'

export function LandlordApplicantVerificationBadges({
  verification,
}: {
  verification: LandlordSeenStudentVerification | null | undefined
}) {
  const v = verification
  if (v?.verification_type === 'student') {
    return (
      <div className="mt-1.5 flex max-w-full min-w-0 flex-wrap gap-1.5" aria-label="Tenant verification">
        <span className={tierPillClass} title="Fully verified student tenant">
          <span aria-hidden>🎓</span> Verified Student
        </span>
      </div>
    )
  }
  if (v?.verification_type === 'identity') {
    return (
      <div className="mt-1.5 flex max-w-full min-w-0 flex-wrap gap-1.5" aria-label="Tenant verification">
        <span className={tierPillClass} title="Identity verification complete">
          <span aria-hidden>✅</span> Verified Identity
        </span>
        {v.work_email_verified === true && (
          <span className={pillClass} title="Work email verified">
            <span aria-hidden>✅</span> Work Email Verified
          </span>
        )}
      </div>
    )
  }

  const uni = v?.uni_email_verified === true
  const work = v?.work_email_verified === true
  const id = Boolean(v?.id_provided)
  const en = Boolean(v?.enrolment_provided)
  const sup = Boolean(v?.identity_supporting_provided)
  const any = uni || work || id || en || sup

  if (!any) {
    return <p className="text-[11px] sm:text-xs text-gray-500 mt-1.5">No verification completed.</p>
  }

  return (
    <div className="mt-1.5 flex max-w-full min-w-0 flex-wrap gap-1.5" aria-label="Student verification">
      {uni && (
        <span className={pillClass} title="University email verified">
          <span aria-hidden>✅</span> Uni Email Verified
        </span>
      )}
      {work && (
        <span className={pillClass} title="Work email verified">
          <span aria-hidden>✅</span> Work Email Verified
        </span>
      )}
      {id && (
        <span className={pillClass} title="ID document on file">
          <span aria-hidden>📄</span> ID Provided
        </span>
      )}
      {en && (
        <span className={pillClass} title="Enrolment document on file">
          <span aria-hidden>🎓</span> Enrolment Provided
        </span>
      )}
      {sup && (
        <span className={pillClass} title="Supporting document on file">
          <span aria-hidden>📎</span> Supporting doc
        </span>
      )}
    </div>
  )
}

export function LandlordApplicantVerificationDetail({
  verification,
}: {
  verification: LandlordSeenStudentVerification | null | undefined
}) {
  const v = verification
  const identityLike =
    v?.verification_type === 'identity' ||
    v?.accommodation_verification_route === 'non_student' ||
    v?.identity_supporting_provided === true

  const rows: { label: string; ok: boolean; at: string | null }[] = identityLike
    ? [
        {
          label: 'Work email',
          ok: v?.work_email_verified === true,
          at: v?.work_email_verified_at ?? null,
        },
        { label: 'ID document', ok: Boolean(v?.id_provided), at: v?.id_submitted_at ?? null },
        {
          label: 'Supporting document',
          ok: Boolean(v?.identity_supporting_provided),
          at: v?.identity_supporting_submitted_at ?? null,
        },
      ]
    : [
        {
          label: 'Uni email',
          ok: v?.uni_email_verified === true,
          at: v?.uni_email_verified_at ?? null,
        },
        { label: 'ID document', ok: Boolean(v?.id_provided), at: v?.id_submitted_at ?? null },
        {
          label: 'Enrolment document',
          ok: Boolean(v?.enrolment_provided),
          at: v?.enrolment_submitted_at ?? null,
        },
      ]

  return (
    <ul className="space-y-2 text-sm">
      {rows.map((r) => {
        let okLine: string | null = null
        if (r.ok) {
          if (r.label === 'Uni email') {
            okLine = r.at ? `Uni email verified ${formatDate(r.at)}` : 'Uni email verified'
        } else if (r.label === 'Work email') {
          okLine = r.at ? `Work email verified ${formatDate(r.at)}` : 'Work email verified'
          } else if (r.label === 'ID document') {
            okLine = r.at ? `ID provided ${formatDate(r.at)}` : 'ID provided'
          } else if (r.label === 'Supporting document') {
            okLine = r.at ? `Supporting document provided ${formatDate(r.at)}` : 'Supporting document provided'
          } else {
            okLine = r.at ? `Enrolment provided ${formatDate(r.at)}` : 'Enrolment provided'
          }
        }
        return (
          <li key={r.label} className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
            <span className="font-medium text-gray-900 min-w-[10rem]">{r.label}</span>
            {okLine ? (
              <span className="text-emerald-800">{okLine}</span>
            ) : (
              <span className="text-gray-500">Not provided</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
