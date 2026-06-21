import type { Database } from '../../lib/database.types'
import { isNonStudentAccommodationRoute } from '../../lib/studentOnboarding'
import { Eyebrow } from './primitives'
import { AdminVerificationDocLink } from './AdminVerificationDocLink'
import { formatDate } from '../../pages/admin/adminUi'

type StudentRow = Database['public']['Tables']['student_profiles']['Row'] & {
  universities: { name: string } | null
}

function emailVerificationLabel(row: StudentRow): { label: string; detail: string } | null {
  const studentRoute = row.accommodation_verification_route === 'student'
  const nonStudentRoute = isNonStudentAccommodationRoute(row.accommodation_verification_route)

  if (studentRoute || (!nonStudentRoute && row.uni_email?.trim())) {
    const email = row.uni_email?.trim() || '-'
    if (row.uni_email_verified) {
      return {
        label: 'University email',
        detail: `${email} · verified ${formatDate(row.uni_email_verified_at)}`,
      }
    }
    return { label: 'University email', detail: `${email} · not verified` }
  }

  if (nonStudentRoute || row.work_email?.trim()) {
    const email = row.work_email?.trim() || '-'
    if (row.work_email_verified) {
      return {
        label: 'Work email',
        detail: `${email} · verified ${formatDate(row.work_email_verified_at)}`,
      }
    }
    return { label: 'Work email', detail: `${email} · not verified` }
  }

  return null
}

export function AdminStudentVerificationDrawer({ row }: { row: StudentRow }) {
  const emailStatus = emailVerificationLabel(row)

  return (
    <div className="flex flex-col gap-5">
      {emailStatus ? (
        <div>
          <Eyebrow>Email verification</Eyebrow>
          <dl className="mt-2.5 m-0 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1">
            <dt className="text-[12px] font-medium text-admin-ink-5">{emailStatus.label}</dt>
            <dd className="m-0 text-[13px] text-admin-ink-2">{emailStatus.detail}</dd>
          </dl>
        </div>
      ) : null}

      <div>
        <Eyebrow>Verification documents</Eyebrow>
        <p className="mt-1.5 mb-0 text-[12px] leading-relaxed text-admin-ink-4">
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
