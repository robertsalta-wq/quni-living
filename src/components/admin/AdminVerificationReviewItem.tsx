import { useCallback, useState } from 'react'
import type { Database } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import { apiUrl } from '../../lib/apiUrl'
import {
  type AdminVerificationAction,
  type AdminVerificationItem,
  adminVerificationItemSupportsInReview,
  getVerificationItemDisplayState,
  verificationItemDisplayLabel,
} from '../../lib/adminStudentVerification'
import { formatDate } from '../../pages/admin/adminUi'
import { AdminVerificationDocLink } from './AdminVerificationDocLink'
import type { VerificationDocumentType } from '../../lib/documentAccessLog'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

const DOC_ITEM_TO_STORAGE_TYPE: Record<
  Exclude<AdminVerificationItem, 'uni_email' | 'work_email'>,
  VerificationDocumentType
> = {
  id_document: 'id_document',
  enrolment_doc: 'enrolment_doc',
  identity_supporting_doc: 'identity_supporting_doc',
  visa_doc: 'visa_doc',
}

function stateBadgeClass(kind: ReturnType<typeof getVerificationItemDisplayState>['kind']): string {
  switch (kind) {
    case 'verified':
      return 'bg-emerald-50 text-emerald-800'
    case 'in_review':
      return 'bg-amber-50 text-amber-900'
    case 'submitted':
      return 'bg-indigo-50 text-indigo-800'
    case 'not_submitted':
    case 'not_applicable':
    default:
      return 'bg-admin-surface-3 text-admin-ink-5'
  }
}

function formatStateDetail(
  state: ReturnType<typeof getVerificationItemDisplayState>,
): string {
  const label = verificationItemDisplayLabel(state)
  if (state.kind === 'verified' && state.at && state.at !== new Date(0).toISOString()) {
    return `${label} · ${formatDate(state.at)}`
  }
  return label
}

type ActionButtonProps = {
  label: string
  onClick: () => void
  disabled: boolean
  variant?: 'default' | 'danger'
}

function ActionButton({ label, onClick, disabled, variant = 'default' }: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'rounded-admin-sm border px-2 py-0.5 text-[11px] font-semibold disabled:opacity-50',
        variant === 'danger'
          ? 'border-admin-danger/30 bg-white text-admin-danger-fg hover:bg-admin-danger-bg'
          : 'border-admin-line bg-white text-admin-ink-3 hover:bg-admin-surface-2',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

type Props = {
  row: StudentRow
  item: AdminVerificationItem
  label: string
  onProfileUpdated: (profile: StudentRow) => void
}

export function AdminVerificationReviewItem({ row, item, label, onProfileUpdated }: Props) {
  const [busyAction, setBusyAction] = useState<AdminVerificationAction | null>(null)
  const [error, setError] = useState<string | null>(null)

  const state = getVerificationItemDisplayState(row, item)
  const isDoc = item !== 'uni_email' && item !== 'work_email'
  const canAct = state.kind === 'submitted' || state.kind === 'in_review' || state.kind === 'verified'

  const runAction = useCallback(
    async (action: AdminVerificationAction) => {
      if (busyAction) return
      setBusyAction(action)
      setError(null)

      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          setError('Sign in required')
          return
        }

        const res = await fetch(apiUrl('/api/admin/student-verification'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentProfileId: row.id,
            item,
            action,
          }),
        })

        const json = (await res.json()) as { profile?: StudentRow; error?: string }
        if (!res.ok || !json.profile) {
          setError(json.error || 'Update failed')
          return
        }

        onProfileUpdated(json.profile)
      } catch {
        setError('Update failed')
      } finally {
        setBusyAction(null)
      }
    },
    [busyAction, item, onProfileUpdated, row.id],
  )

  if (state.kind === 'not_applicable') {
    return null
  }

  const docProps =
    isDoc && item in DOC_ITEM_TO_STORAGE_TYPE
      ? {
          filePath:
            item === 'id_document'
              ? row.id_document_url
              : item === 'enrolment_doc'
                ? row.enrolment_doc_url
                : item === 'identity_supporting_doc'
                  ? row.identity_supporting_doc_url
                  : row.visa_doc_url,
          submittedAt:
            item === 'id_document'
              ? row.id_submitted_at
              : item === 'enrolment_doc'
                ? row.enrolment_submitted_at
                : item === 'identity_supporting_doc'
                  ? row.identity_supporting_submitted_at
                  : row.visa_submitted_at,
          documentType: DOC_ITEM_TO_STORAGE_TYPE[item],
        }
      : null

  const emailValue = item === 'uni_email' ? row.uni_email : item === 'work_email' ? row.work_email : null

  return (
    <div className="rounded-admin-sm border border-admin-line bg-admin-surface-2 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[13px] font-medium text-admin-ink-2">{label}</p>
          {emailValue ? (
            <p className="m-0 mt-0.5 truncate text-[12px] text-admin-ink-5">{emailValue}</p>
          ) : null}
          <p className="m-0 mt-1">
            <span
              className={[
                'inline-flex rounded-admin-pill px-2 py-0.5 text-[11px] font-semibold',
                stateBadgeClass(state.kind),
              ].join(' ')}
            >
              {formatStateDetail(state)}
            </span>
          </p>
        </div>
        {docProps ? (
          <AdminVerificationDocLink
            label=""
            filePath={docProps.filePath}
            submittedAt={docProps.submittedAt}
            studentProfileId={row.id}
            documentType={docProps.documentType}
            compact
          />
        ) : null}
      </div>

      {canAct ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <ActionButton
            label="Mark verified"
            disabled={busyAction != null || state.kind === 'verified'}
            onClick={() => void runAction('verify')}
          />
          {adminVerificationItemSupportsInReview(item) ? (
            <ActionButton
              label="Mark in review"
              disabled={busyAction != null || state.kind === 'in_review'}
              onClick={() => void runAction('in_review')}
            />
          ) : null}
          <ActionButton
            label="Reject / clear"
            variant="danger"
            disabled={busyAction != null || state.kind === 'submitted'}
            onClick={() => void runAction('clear')}
          />
        </div>
      ) : null}

      {busyAction ? (
        <p className="m-0 mt-2 text-[11px] text-admin-ink-5">Updating…</p>
      ) : null}
      {error ? <p className="m-0 mt-2 text-[11px] text-admin-danger-fg">{error}</p> : null}
    </div>
  )
}
