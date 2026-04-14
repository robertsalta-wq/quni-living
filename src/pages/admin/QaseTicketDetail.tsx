import { type ChangeEvent, type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthContext } from '../../context/AuthContext'
import type {
  QaseField,
  QaseMessage,
  QasePriority,
  QaseStatus,
  QaseSubmitterType,
  QaseTicket,
  QaseTicketContextBooking,
  QaseTicketContextProperty,
  QaseTicketWithContext,
} from '../../types/qase'
import { adminCardClass, formatDate, formatRelativeTime } from './adminUi'

const MAX_ATTACHMENT_FILES = 10
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024

const ATTACHMENT_ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain'

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
])

const IMAGE_MIME_PREFIX = 'image/'

const NOTIFY_URL = 'https://flegysnshryzvkwzfclc.supabase.co/functions/v1/qase-notify'

function fireNotify(messageId: string): void {
  const secret = import.meta.env.VITE_QASE_INTERNAL_SECRET
  if (typeof secret !== 'string' || !secret.trim()) return
  void fetch(NOTIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-qase-internal': secret.trim(),
    },
    body: JSON.stringify({ message_id: messageId }),
  }).catch(() => {})
}

const STATUSES: QaseStatus[] = ['new', 'open', 'pending', 'on_hold', 'solved', 'closed']
const PRIORITIES: QasePriority[] = ['urgent', 'high', 'normal', 'low']

/** Sets `resolved_at` when marking solved; clears when returning to an active queue state; leaves unchanged for `closed`. */
function resolvedAtPatch(next: QaseStatus): { resolved_at?: string | null } {
  if (next === 'solved') {
    return { resolved_at: new Date().toISOString() }
  }
  if (next === 'closed') {
    return {}
  }
  return { resolved_at: null }
}

function asTicket(row: unknown): QaseTicket {
  return row as QaseTicket
}

function asMessage(row: unknown): QaseMessage {
  return row as QaseMessage
}

function asField(row: unknown): QaseField {
  return row as QaseField
}

function asBooking(row: unknown): QaseTicketContextBooking | null {
  if (!row || typeof row !== 'object') return null
  return row as QaseTicketContextBooking
}

function asProperty(row: unknown): QaseTicketContextProperty | null {
  if (!row || typeof row !== 'object') return null
  return row as QaseTicketContextProperty
}

type QaseStudentSubmitterProfile = {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  university: string | null
  created_at: string
}

type QaseLandlordSubmitterProfile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  created_at: string
}

type SubmitterPanelState =
  | { kind: 'anonymous' }
  | { kind: 'admin_ticket' }
  | { kind: 'unlinked'; submitterType: 'student' | 'landlord' }
  | { kind: 'student'; profile: QaseStudentSubmitterProfile }
  | { kind: 'landlord'; profile: QaseLandlordSubmitterProfile }
  | { kind: 'fetch_error'; message: string }
  | { kind: 'profile_missing'; submitterType: 'student' | 'landlord' }

function submitterTypeBadgeClass(t: QaseSubmitterType | string): string {
  switch (t) {
    case 'student':
      return 'bg-sky-100 text-sky-800'
    case 'landlord':
      return 'bg-violet-100 text-violet-800'
    case 'anonymous':
      return 'bg-gray-100 text-gray-600'
    case 'admin':
      return 'bg-slate-200 text-slate-800'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function formatSubmitterTypeLabel(t: QaseSubmitterType | string): string {
  if (t === 'anonymous') return 'Anonymous'
  if (t === 'admin') return 'Admin'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Avatar letter for thread bubbles (admin / student / landlord). */
function messageAuthorInitial(authorType: string): string {
  if (authorType === 'admin') return 'A'
  if (authorType === 'student') return 'S'
  if (authorType === 'landlord') return 'L'
  if (authorType === 'anonymous') return '?'
  return authorType ? authorType.charAt(0).toUpperCase() : '?'
}

function messageAuthorDisplayLabel(authorType: string): string {
  return formatSubmitterTypeLabel(authorType as QaseSubmitterType)
}

function studentSubmitterDisplayName(p: Pick<QaseStudentSubmitterProfile, 'full_name' | 'first_name' | 'last_name'>): string {
  if (p.full_name?.trim()) return p.full_name.trim()
  const fn = p.first_name?.trim() ?? ''
  const ln = p.last_name?.trim() ?? ''
  const combined = `${fn} ${ln}`.trim()
  return combined || 'Anonymous'
}

function parseStudentSubmitterRow(row: unknown): QaseStudentSubmitterProfile {
  const r = row as Record<string, unknown>
  const uni = r.universities as { name?: string } | null | undefined
  const uniName = uni && typeof uni === 'object' && typeof uni.name === 'string' ? uni.name : null
  return {
    id: String(r.id),
    full_name: r.full_name == null ? null : String(r.full_name),
    first_name: r.first_name == null ? null : String(r.first_name),
    last_name: r.last_name == null ? null : String(r.last_name),
    email: r.email == null ? null : String(r.email),
    university: uniName,
    created_at: String(r.created_at),
  }
}

function parseLandlordSubmitterRow(row: unknown): QaseLandlordSubmitterProfile {
  const r = row as Record<string, unknown>
  return {
    id: String(r.id),
    full_name: r.full_name == null ? null : String(r.full_name),
    email: r.email == null ? null : String(r.email),
    phone: r.phone == null ? null : String(r.phone),
    created_at: String(r.created_at),
  }
}

type QaseAttachmentRow = {
  id: string
  message_id: string | null
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
}

function asAttachmentRow(row: unknown): QaseAttachmentRow {
  const r = row as Record<string, unknown>
  return {
    id: String(r.id),
    message_id: r.message_id == null ? null : String(r.message_id),
    file_name: String(r.file_name),
    file_path: String(r.file_path),
    file_size: Number(r.file_size),
    mime_type: String(r.mime_type),
  }
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').trim() || 'file'
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, '_').replace(/_+/g, '_')
  return cleaned.length > 180 ? `${cleaned.slice(0, 176)}…` : cleaned
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateAttachmentList(files: File[]): string | null {
  if (files.length > MAX_ATTACHMENT_FILES) {
    return `You can attach at most ${MAX_ATTACHMENT_FILES} files.`
  }
  const big = files.find((f) => f.size > MAX_ATTACHMENT_BYTES)
  if (big) {
    return `${big.name} exceeds the 20MB limit.`
  }
  const badType = files.find((f) => f.type && !ALLOWED_MIME.has(f.type))
  if (badType) {
    return `${badType.name} is not an allowed file type.`
  }
  return null
}

function isImageAttachmentMime(mime: string): boolean {
  return mime.startsWith(IMAGE_MIME_PREFIX)
}

function FileGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  )
}

function QaseAttachmentChip({
  attachment,
  onDeleted,
  onError,
  inverse,
}: {
  attachment: QaseAttachmentRow
  onDeleted: () => void
  onError: (msg: string) => void
  /** Dark / indigo message bubble — higher-contrast chip chrome */
  inverse?: boolean
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [urlLoading, setUrlLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase.storage.from('qase-attachments').createSignedUrl(attachment.file_path, 3600)
      if (cancelled) return
      if (error || !data?.signedUrl) {
        setSignedUrl(null)
        setUrlLoading(false)
        return
      }
      setSignedUrl(data.signedUrl)
      setUrlLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [attachment.file_path])

  function openInNewTab() {
    if (!signedUrl) return
    window.open(signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleRemove(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Remove attachment "${attachment.file_name}"?`)) return
    const { error: rmErr } = await supabase.storage.from('qase-attachments').remove([attachment.file_path])
    if (rmErr) {
      onError(rmErr.message)
      return
    }
    const { error: delErr } = await supabase.from('qase_attachments' as 'bookings').delete().eq('id', attachment.id)
    if (delErr) {
      onError(delErr.message)
      return
    }
    onDeleted()
  }

  const isImage = isImageAttachmentMime(attachment.mime_type)

  const shellClass = inverse
    ? 'relative inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-1 py-1 pr-7 text-left text-sm text-white shadow-sm'
    : 'relative inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-1 py-1 pr-7 text-left text-sm text-gray-800 shadow-sm'

  const openBtnClass = inverse
    ? 'inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-0.5 py-0.5 text-left hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50'
    : 'inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-0.5 py-0.5 text-left hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50'

  const removeBtnClass = inverse
    ? 'absolute right-0.5 top-0.5 z-10 flex h-6 w-6 items-center justify-center rounded text-base leading-none text-indigo-100 hover:bg-red-500/30 hover:text-white'
    : 'absolute right-0.5 top-0.5 z-10 flex h-6 w-6 items-center justify-center rounded text-base leading-none text-gray-500 hover:bg-red-100 hover:text-red-700'

  if (isImage) {
    return (
      <div className={shellClass} title={attachment.file_name}>
        <button type="button" onClick={openInNewTab} disabled={!signedUrl} className={openBtnClass}>
          <span className={`relative h-[50px] w-[50px] shrink-0 overflow-hidden rounded-md ${inverse ? 'bg-white/15' : 'bg-gray-200'}`}>
            {urlLoading ? (
              <span className={`absolute inset-0 animate-pulse ${inverse ? 'bg-white/20' : 'bg-gray-300'}`} />
            ) : signedUrl ? (
              <img src={signedUrl} alt="" className="h-full w-full object-cover" width={50} height={50} />
            ) : (
              <span className={`flex h-full w-full items-center justify-center text-[10px] ${inverse ? 'text-indigo-100' : 'text-gray-500'}`}>?</span>
            )}
          </span>
          <span className="max-w-[140px] truncate text-xs font-medium">{attachment.file_name}</span>
        </button>
        <button type="button" onClick={(e) => void handleRemove(e)} className={removeBtnClass} aria-label={`Remove ${attachment.file_name}`}>
          ×
        </button>
      </div>
    )
  }

  return (
    <div className={shellClass} title={attachment.file_name}>
      <button type="button" onClick={openInNewTab} disabled={!signedUrl} className={openBtnClass}>
        <FileGlyph className={`h-5 w-5 shrink-0 ${inverse ? 'text-indigo-100' : 'text-gray-500'}`} />
        <span className="max-w-[180px] truncate text-xs font-medium">{attachment.file_name}</span>
      </button>
      <button type="button" onClick={(e) => void handleRemove(e)} className={removeBtnClass} aria-label={`Remove ${attachment.file_name}`}>
        ×
      </button>
    </div>
  )
}

function selectClassName(): string {
  return 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20'
}

function labelClass(): string {
  return 'block text-xs font-semibold uppercase tracking-wide text-gray-500'
}

function SubmitterPanelBody({ state }: { state: SubmitterPanelState }) {
  switch (state.kind) {
    case 'anonymous':
      return (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${submitterTypeBadgeClass('anonymous')}`}>
              {formatSubmitterTypeLabel('anonymous')}
            </span>
            <span className="text-xs font-medium text-amber-700">Unlinked</span>
          </div>
          <p className="text-sm text-gray-700">Anonymous submission — no profile linked</p>
        </>
      )
    case 'admin_ticket':
      return (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${submitterTypeBadgeClass('admin')}`}>
              {formatSubmitterTypeLabel('admin')}
            </span>
          </div>
          <p className="text-sm text-gray-700">
            Staff-created ticket. No student or landlord profile is linked as the submitter.
          </p>
        </>
      )
    case 'unlinked':
      return (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${submitterTypeBadgeClass(state.submitterType)}`}
            >
              {formatSubmitterTypeLabel(state.submitterType)}
            </span>
            <span className="text-xs font-medium text-amber-700">Unlinked</span>
          </div>
          <p className="text-sm text-gray-700">No profile linked to this ticket.</p>
        </>
      )
    case 'fetch_error':
      return (
        <p className="text-sm text-red-700" role="alert">
          {state.message}
        </p>
      )
    case 'profile_missing':
      return (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${submitterTypeBadgeClass(state.submitterType)}`}
            >
              {formatSubmitterTypeLabel(state.submitterType)}
            </span>
          </div>
          <p className="text-sm text-amber-800">Submitter profile could not be found.</p>
        </>
      )
    case 'student': {
      const p = state.profile
      const name = studentSubmitterDisplayName(p)
      const emailTrim = p.email?.trim() ?? ''
      return (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${submitterTypeBadgeClass('student')}`}>
              {formatSubmitterTypeLabel('student')}
            </span>
          </div>
          <div>
            <span className={labelClass()}>Name</span>
            <p className="mt-1 text-gray-900 font-medium">{name}</p>
          </div>
          <div>
            <span className={labelClass()}>Email</span>
            <p className="mt-1 text-gray-800">
              {emailTrim ? (
                <a href={`mailto:${encodeURIComponent(emailTrim)}`} className="text-indigo-600 hover:text-indigo-800 font-medium">
                  {emailTrim}
                </a>
              ) : (
                '—'
              )}
            </p>
          </div>
          {p.university?.trim() ? (
            <div>
              <span className={labelClass()}>University</span>
              <p className="mt-1 text-gray-800">{p.university.trim()}</p>
            </div>
          ) : null}
          <div>
            <span className={labelClass()}>Member since</span>
            <p className="mt-1 text-gray-800">{formatDate(p.created_at)}</p>
          </div>
          <div>
            <Link to={`/admin/students?profile=${p.id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              View in Students →
            </Link>
          </div>
        </div>
      )
    }
    case 'landlord': {
      const p = state.profile
      const name = p.full_name?.trim() || 'Anonymous'
      const emailTrim = p.email?.trim() ?? ''
      const phoneTrim = p.phone?.trim() ?? ''
      return (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${submitterTypeBadgeClass('landlord')}`}>
              {formatSubmitterTypeLabel('landlord')}
            </span>
          </div>
          <div>
            <span className={labelClass()}>Name</span>
            <p className="mt-1 text-gray-900 font-medium">{name}</p>
          </div>
          <div>
            <span className={labelClass()}>Email</span>
            <p className="mt-1 text-gray-800">
              {emailTrim ? (
                <a href={`mailto:${encodeURIComponent(emailTrim)}`} className="text-indigo-600 hover:text-indigo-800 font-medium">
                  {emailTrim}
                </a>
              ) : (
                '—'
              )}
            </p>
          </div>
          {phoneTrim ? (
            <div>
              <span className={labelClass()}>Phone</span>
              <p className="mt-1 text-gray-800">
                <a href={`tel:${phoneTrim.replace(/\s/g, '')}`} className="text-indigo-600 hover:text-indigo-800 font-medium">
                  {phoneTrim}
                </a>
              </p>
            </div>
          ) : null}
          <div>
            <span className={labelClass()}>Member since</span>
            <p className="mt-1 text-gray-800">{formatDate(p.created_at)}</p>
          </div>
          <div>
            <Link to={`/admin/landlords?profile=${p.id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              View in Landlords →
            </Link>
          </div>
        </div>
      )
    }
    default:
      return <p className="text-sm text-gray-500">—</p>
  }
}

export default function QaseTicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()

  const [ctx, setCtx] = useState<QaseTicketWithContext | null>(null)
  const [categories, setCategories] = useState<QaseField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [replyInternal, setReplyInternal] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const [relinkOpen, setRelinkOpen] = useState(false)
  const [relinkUuid, setRelinkUuid] = useState('')
  const [savingRelink, setSavingRelink] = useState(false)
  const [attachments, setAttachments] = useState<QaseAttachmentRow[]>([])
  const [replyAttachmentFiles, setReplyAttachmentFiles] = useState<File[]>([])
  const [replyAttachmentValidationError, setReplyAttachmentValidationError] = useState<string | null>(null)
  const [submitterPanel, setSubmitterPanel] = useState<SubmitterPanelState | null>(null)

  const loadAll = useCallback(async () => {
    if (!ticketId || !isSupabaseConfigured) {
      setCtx(null)
      setAttachments([])
      setSubmitterPanel(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data: ticketRow, error: ticketErr } = await supabase
      .from('qase_tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle()

    if (ticketErr) {
      setError(ticketErr.message)
      setCtx(null)
      setAttachments([])
      setSubmitterPanel(null)
      setLoading(false)
      return
    }
    if (!ticketRow) {
      setError('Ticket not found.')
      setCtx(null)
      setAttachments([])
      setSubmitterPanel(null)
      setLoading(false)
      return
    }

    const ticket = asTicket(ticketRow)

    const [
      { data: msgRows, error: msgErr },
      { data: catRows, error: catErr },
      { data: attRows, error: attErr },
    ] = await Promise.all([
      supabase.from('qase_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
      supabase
        .from('qase_fields')
        .select('*')
        .eq('field_type', 'category')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('qase_attachments' as 'bookings')
        .select('id, message_id, file_name, file_path, file_size, mime_type')
        .eq('ticket_id', ticketId),
    ])

    if (msgErr || catErr || attErr) {
      setError(msgErr?.message ?? catErr?.message ?? attErr?.message ?? 'Failed to load related data')
    }

    const messages = (msgRows ?? []).map(asMessage)
    setCategories((catRows ?? []).map(asField))
    setAttachments((attRows ?? []).map(asAttachmentRow))

    let booking: QaseTicketContextBooking | null = null
    let property: QaseTicketContextProperty | null = null

    if (ticket.booking_id) {
      const { data: b } = await supabase
        .from('bookings')
        .select('id, landlord_id, student_id, property_id, status')
        .eq('id', ticket.booking_id)
        .maybeSingle()
      booking = asBooking(b)
    }

    if (ticket.property_id) {
      const { data: p } = await supabase
        .from('properties')
        .select('id, address, landlord_id')
        .eq('id', ticket.property_id)
        .maybeSingle()
      property = asProperty(p)
    }

    if (ticket.submitted_by_type === 'anonymous') {
      setSubmitterPanel({ kind: 'anonymous' })
    } else if (ticket.submitted_by_type === 'student') {
      if (!ticket.submitted_by_id) {
        setSubmitterPanel({ kind: 'unlinked', submitterType: 'student' })
      } else {
        const { data: spRow, error: spErr } = await supabase
          .from('student_profiles')
          .select('id, full_name, first_name, last_name, email, created_at, universities ( name )')
          .eq('id', ticket.submitted_by_id)
          .maybeSingle()
        if (spErr) {
          setSubmitterPanel({ kind: 'fetch_error', message: spErr.message })
        } else if (!spRow) {
          setSubmitterPanel({ kind: 'profile_missing', submitterType: 'student' })
        } else {
          setSubmitterPanel({ kind: 'student', profile: parseStudentSubmitterRow(spRow) })
        }
      }
    } else if (ticket.submitted_by_type === 'landlord') {
      if (!ticket.submitted_by_id) {
        setSubmitterPanel({ kind: 'unlinked', submitterType: 'landlord' })
      } else {
        const { data: lpRow, error: lpErr } = await supabase
          .from('landlord_profiles')
          .select('id, full_name, email, phone, created_at')
          .eq('id', ticket.submitted_by_id)
          .maybeSingle()
        if (lpErr) {
          setSubmitterPanel({ kind: 'fetch_error', message: lpErr.message })
        } else if (!lpRow) {
          setSubmitterPanel({ kind: 'profile_missing', submitterType: 'landlord' })
        } else {
          setSubmitterPanel({ kind: 'landlord', profile: parseLandlordSubmitterRow(lpRow) })
        }
      }
    } else if (ticket.submitted_by_type === 'admin') {
      setSubmitterPanel({ kind: 'admin_ticket' })
    } else {
      setSubmitterPanel({ kind: 'fetch_error', message: 'Unknown submitter type.' })
    }

    setCtx({
      ...ticket,
      messages,
      booking,
      property,
    })
    setLoading(false)
  }, [ticketId])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const ticket = ctx

  const attachmentsByMessageId = useMemo(() => {
    const map = new Map<string, QaseAttachmentRow[]>()
    for (const a of attachments) {
      if (!a.message_id) continue
      const arr = map.get(a.message_id) ?? []
      arr.push(a)
      map.set(a.message_id, arr)
    }
    return map
  }, [attachments])

  const canSendReply = useMemo(() => {
    return (
      replyBody.trim().length > 0 &&
      !sendingReply &&
      !!ticketId &&
      !!user?.id &&
      !replyAttachmentValidationError
    )
  }, [replyBody, replyAttachmentValidationError, sendingReply, ticketId, user?.id])

  async function updateTicket(patch: Partial<QaseTicket>) {
    if (!ticketId) return
    const { error: upErr } = await supabase
      .from('qase_tickets' as 'bookings')
      .update(patch as never)
      .eq('id', ticketId)
    if (upErr) {
      setError(upErr.message)
      return
    }
    setCtx((c) => (c ? { ...c, ...patch } : c))
  }

  async function onStatusChange(next: QaseStatus) {
    if (!ticket) return
    const resolved = resolvedAtPatch(next)
    await updateTicket({ status: next, ...resolved })
  }

  async function onPriorityChange(next: QasePriority) {
    await updateTicket({ priority: next })
  }

  async function onCategoryChange(fieldKey: string) {
    const next = fieldKey === '' ? null : fieldKey
    await updateTicket({ category: next })
  }

  function handleReplyAttachmentInputChange(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files
    e.target.value = ''
    if (!list?.length) return
    const incoming = Array.from(list)
    const merged = [...replyAttachmentFiles, ...incoming]
    if (merged.length > MAX_ATTACHMENT_FILES) {
      const slice = merged.slice(0, MAX_ATTACHMENT_FILES)
      setReplyAttachmentFiles(slice)
      const sliceErr = validateAttachmentList(slice)
      setReplyAttachmentValidationError(
        sliceErr ?? `You can attach at most ${MAX_ATTACHMENT_FILES} files.`,
      )
      return
    }
    const err = validateAttachmentList(merged)
    if (err) {
      setReplyAttachmentValidationError(err)
      return
    }
    setReplyAttachmentFiles(merged)
    setReplyAttachmentValidationError(null)
  }

  function removeReplyAttachmentAt(index: number) {
    const next = replyAttachmentFiles.filter((_, i) => i !== index)
    setReplyAttachmentFiles(next)
    setReplyAttachmentValidationError(validateAttachmentList(next))
  }

  async function handleSendReply() {
    if (!ticketId || !user?.id || !replyBody.trim()) return
    setSendingReply(true)
    setError(null)
    try {
      const { data: newMsgRaw, error: insErr } = await supabase
        .from('qase_messages' as 'bookings')
        .insert({
          ticket_id: ticketId,
          author_id: user.id,
          author_type: 'admin',
          body: replyBody.trim(),
          is_internal_note: replyInternal,
        } as never)
        .select('id')
        .single()
      const newMsg = newMsgRaw as unknown as { id: string } | null
      if (insErr) {
        setError(insErr.message)
        return
      }
      const msgId = newMsg?.id
      if (msgId && !replyInternal) {
        fireNotify(msgId)
      }

      const files = [...replyAttachmentFiles]
      const uploadFailures: string[] = []
      if (msgId && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const safeName = sanitizeFileName(file.name)
          const path = `${ticketId}/${Date.now()}-${i}-${safeName}`
          const mime = file.type && ALLOWED_MIME.has(file.type) ? file.type : 'application/octet-stream'

          const { error: upErr } = await supabase.storage.from('qase-attachments').upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: mime,
          })
          if (upErr) {
            console.error('Qase admin attachment upload', upErr)
            uploadFailures.push(file.name)
            continue
          }

          const { error: attErr } = await supabase.from('qase_attachments' as 'bookings').insert({
            ticket_id: ticketId,
            message_id: msgId,
            file_name: file.name,
            file_path: path,
            file_size: file.size,
            mime_type: mime,
            uploaded_by_id: user.id,
            uploaded_by_type: 'admin',
          } as never)

          if (attErr) {
            console.error('Qase admin attachment row', attErr)
            uploadFailures.push(file.name)
            void supabase.storage.from('qase-attachments').remove([path])
          }
        }
      }

      setReplyBody('')
      setReplyInternal(false)
      setReplyAttachmentFiles([])
      setReplyAttachmentValidationError(null)
      if (uploadFailures.length > 0) {
        setError(
          `Reply posted, but these attachments could not be uploaded: ${uploadFailures.join(', ')}.`,
        )
      }

      await loadAll()
    } finally {
      setSendingReply(false)
    }
  }

  async function handleSaveRelink() {
    if (!ticketId) return
    const trimmed = relinkUuid.trim()
    if (!trimmed) {
      setError('Enter a booking UUID.')
      return
    }
    setSavingRelink(true)
    setError(null)
    const { error: upErr } = await supabase
      .from('qase_tickets' as 'bookings')
      .update({ booking_id: trimmed } as never)
      .eq('id', ticketId)
    setSavingRelink(false)
    if (upErr) {
      setError(upErr.message)
      return
    }
    setRelinkOpen(false)
    setRelinkUuid('')
    await loadAll()
  }

  if (!ticketId) {
    return (
      <div>
        <p className="text-sm text-gray-600">Missing ticket id.</p>
        <Link to="/admin/qase" className="text-indigo-600 text-sm font-medium mt-2 inline-block">
          ← Support (Qase)
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/admin/qase" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
        ← Support (Qase)
      </Link>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !ticket ? (
        <div className="mt-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}
          <button
            type="button"
            onClick={() => navigate('/admin/qase')}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Back to queue
          </button>
        </div>
      ) : (
        <div className="w-full max-w-full">
          <header className="mt-4 mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">#{ticket.ticket_number}</h1>
            <p className="text-sm text-gray-500 mt-1">{ticket.subject}</p>
          </header>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          <div className="flex w-full flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-8">
            {/* Thread column: scrollable messages + pinned reply */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="min-h-0 max-h-[55vh] space-y-4 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-14rem)]">
                {(ticket.messages ?? []).length === 0 ? (
                  <p className="py-6 text-sm text-gray-500">No messages yet.</p>
                ) : (
                  (ticket.messages ?? []).map((m) => {
                    const msgAttachments = attachmentsByMessageId.get(m.id) ?? []
                    const attachmentRow = (inverse?: boolean) =>
                      msgAttachments.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msgAttachments.map((a) => (
                            <QaseAttachmentChip
                              key={a.id}
                              attachment={a}
                              inverse={inverse}
                              onDeleted={() => void loadAll()}
                              onError={(msg) => setError(msg)}
                            />
                          ))}
                        </div>
                      ) : null

                    if (m.is_internal_note) {
                      return (
                        <div key={m.id} className="flex w-full justify-start">
                          <div className="flex w-full min-w-0 max-w-[min(100%,42rem)] items-start gap-2">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-amber-950 shadow-sm ring-2 ring-amber-300/60"
                              aria-hidden
                            >
                              {messageAuthorInitial(m.author_type)}
                            </div>
                            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-amber-200 border-l-4 border-l-amber-400 bg-amber-50/90 px-3 py-2.5 shadow-sm">
                              <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                                <span className="font-semibold uppercase tracking-wide text-amber-900">Internal note</span>
                                <span className="text-amber-800/90" title={m.created_at}>
                                  {formatRelativeTime(m.created_at)}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm text-gray-900">{m.body}</p>
                              {attachmentRow(false)}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    const isAdminPublic = m.author_type === 'admin'

                    if (isAdminPublic) {
                      return (
                        <div key={m.id} className="flex justify-end">
                          <div className="flex max-w-[min(100%,36rem)] flex-row-reverse items-start gap-2">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-md ring-2 ring-indigo-500/25"
                              aria-hidden
                            >
                              {messageAuthorInitial(m.author_type)}
                            </div>
                            <div className="min-w-0 rounded-2xl rounded-tr-sm bg-indigo-600 px-3 py-2.5 text-white shadow-md">
                              <div className="mb-1.5 flex flex-wrap items-center gap-x-2 text-xs font-medium text-indigo-100">
                                <span>{messageAuthorDisplayLabel(m.author_type)}</span>
                                <span className="text-indigo-200/95" title={m.created_at}>
                                  {formatRelativeTime(m.created_at)}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm text-white/95">{m.body}</p>
                              {attachmentRow(true)}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={m.id} className="flex justify-start">
                        <div className="flex max-w-[min(100%,36rem)] items-start gap-2">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700 shadow-sm ring-1 ring-gray-300/80"
                            aria-hidden
                          >
                            {messageAuthorInitial(m.author_type)}
                          </div>
                          <div className="min-w-0 rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-50 px-3 py-2.5 shadow-sm">
                            <div className="mb-1.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                              <span className="font-medium text-gray-800">{messageAuthorDisplayLabel(m.author_type)}</span>
                              <span className="text-gray-400" title={m.created_at}>
                                {formatRelativeTime(m.created_at)}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm text-gray-900">{m.body}</p>
                            {attachmentRow(false)}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {(ticket.ai_suggested_category?.trim() ||
                ticket.ai_suggested_priority?.trim() ||
                ticket.ai_draft_reply?.trim()) && (
                <section className={`${adminCardClass} mt-4 shrink-0`}>
                  <h2 className="mb-4 text-sm font-semibold text-gray-900">AI triage</h2>
                  <div className="space-y-3 text-sm">
                    {ticket.ai_suggested_category ? (
                      <div>
                        <span className={labelClass()}>Suggested category</span>
                        <p className="mt-1 text-gray-800">{ticket.ai_suggested_category}</p>
                      </div>
                    ) : null}
                    {ticket.ai_suggested_priority ? (
                      <div>
                        <span className={labelClass()}>Suggested priority</span>
                        <p className="mt-1 text-gray-800">{ticket.ai_suggested_priority}</p>
                      </div>
                    ) : null}
                    {ticket.ai_draft_reply ? (
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className={labelClass()}>Draft reply</span>
                          <button
                            type="button"
                            className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            onClick={() => setReplyBody(ticket.ai_draft_reply ?? '')}
                          >
                            Use draft
                          </button>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-gray-800">
                          {ticket.ai_draft_reply}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </section>
              )}

              <div className={`${adminCardClass} mt-4 shrink-0 space-y-3`}>
                <label className="block">
                  <span className={labelClass()}>Reply</span>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Write a reply…"
                  />
                </label>
                <div>
                  <label htmlFor="qase-reply-attachments" className={labelClass()}>
                    Attachments (optional)
                  </label>
                  <input
                    id="qase-reply-attachments"
                    type="file"
                    multiple
                    accept={ATTACHMENT_ACCEPT}
                    onChange={handleReplyAttachmentInputChange}
                    disabled={sendingReply}
                    className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-800 hover:file:bg-gray-200"
                  />
                  <p className="mt-1 text-xs text-gray-400">Up to 10 files, 20MB each.</p>
                  {replyAttachmentValidationError && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {replyAttachmentValidationError}
                    </p>
                  )}
                  {replyAttachmentFiles.length > 0 && (
                    <ul className="mt-2 space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                      {replyAttachmentFiles.map((f, idx) => (
                        <li key={`${f.name}-${f.size}-${idx}`} className="flex items-start justify-between gap-2 text-sm">
                          <span className="min-w-0 break-words text-gray-800">
                            {f.name} <span className="text-gray-500">({formatFileSize(f.size)})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => removeReplyAttachmentAt(idx)}
                            disabled={sendingReply}
                            className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={replyInternal}
                    onChange={(e) => setReplyInternal(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Internal note
                </label>
                <button
                  type="button"
                  disabled={!canSendReply}
                  onClick={() => void handleSendReply()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendingReply ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>

            <aside className="w-full shrink-0 space-y-6 lg:w-[380px] lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
              <section className={adminCardClass}>
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Ticket details</h2>
                <div className="space-y-4">
                  <div>
                    <span className={labelClass()}>Status</span>
                    <select
                      className={selectClassName()}
                      value={ticket.status}
                      onChange={(e) => void onStatusChange(e.target.value as QaseStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className={labelClass()}>Priority</span>
                    <select
                      className={selectClassName()}
                      value={ticket.priority}
                      onChange={(e) => void onPriorityChange(e.target.value as QasePriority)}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className={labelClass()}>Category</span>
                    <select
                      className={selectClassName()}
                      value={ticket.category ?? ''}
                      onChange={(e) => void onCategoryChange(e.target.value)}
                    >
                      <option value="">— None —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.field_key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className={labelClass()}>Received via</span>
                    <p className="mt-1 text-sm text-gray-800">{ticket.received_via}</p>
                  </div>
                  <div>
                    <span className={labelClass()}>Created</span>
                    <p className="mt-1 text-sm text-gray-800">{formatDate(ticket.created_at)}</p>
                  </div>
                  <div>
                    <span className={labelClass()}>Resolved</span>
                    <p className="mt-1 text-sm text-gray-800">{ticket.resolved_at ? formatDate(ticket.resolved_at) : '—'}</p>
                  </div>
                </div>
              </section>

              <section className={adminCardClass}>
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Submitter</h2>
                {submitterPanel ? <SubmitterPanelBody state={submitterPanel} /> : <p className="text-sm text-gray-500">—</p>}
              </section>

              <section className={adminCardClass}>
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Linked context</h2>
                {!ticket.booking_id && !ticket.property_id ? (
                  <p className="text-sm text-gray-500">No booking or property linked</p>
                ) : (
                  <div className="space-y-4 text-sm">
                    {ticket.booking_id ? (
                      <div>
                        <span className={labelClass()}>Booking</span>
                        {ticket.booking ? (
                          <dl className="mt-2 space-y-1 text-gray-800">
                            <div className="flex justify-between gap-2">
                              <dt className="text-gray-500">ID</dt>
                              <dd className="font-mono text-xs break-all">{ticket.booking.id}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-gray-500">Landlord</dt>
                              <dd className="font-mono text-xs break-all">{ticket.booking.landlord_id ?? '—'}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-gray-500">Student</dt>
                              <dd className="font-mono text-xs break-all">{ticket.booking.student_id ?? '—'}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-gray-500">Status</dt>
                              <dd>{ticket.booking.status}</dd>
                            </div>
                          </dl>
                        ) : (
                          <p className="mt-2 text-amber-800 text-sm">
                            Booking not found for ID <span className="font-mono text-xs">{ticket.booking_id}</span>
                          </p>
                        )}
                      </div>
                    ) : null}

                    {ticket.property_id ? (
                      <div>
                        <span className={labelClass()}>Property</span>
                        {ticket.property ? (
                          <dl className="mt-2 space-y-1 text-gray-800">
                            <div className="flex justify-between gap-2">
                              <dt className="text-gray-500">ID</dt>
                              <dd className="font-mono text-xs break-all">{ticket.property.id}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-500">Address</dt>
                              <dd className="mt-0.5">{ticket.property.address ?? '—'}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-gray-500">Landlord ID</dt>
                              <dd className="font-mono text-xs break-all">{ticket.property.landlord_id ?? '—'}</dd>
                            </div>
                          </dl>
                        ) : (
                          <p className="mt-2 text-amber-800 text-sm">
                            Property not found for ID <span className="font-mono text-xs">{ticket.property_id}</span>
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                <div
                  className={`mt-4 space-y-2 ${ticket.booking_id || ticket.property_id ? 'border-t border-gray-100 pt-4' : ''}`}
                >
                  <span className={labelClass()}>Re-link booking</span>
                  {!relinkOpen ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRelinkOpen(true)
                        setRelinkUuid(ticket.booking_id ?? '')
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Re-link booking
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={relinkUuid}
                        onChange={(e) => setRelinkUuid(e.target.value)}
                        placeholder="Booking UUID"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={savingRelink}
                          onClick={() => void handleSaveRelink()}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRelinkOpen(false)
                            setRelinkUuid('')
                          }}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}
    </div>
  )
}
