import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthContext } from '../../context/AuthContext'
import type {
  QaseField,
  QaseMessage,
  QasePriority,
  QaseStatus,
  QaseTicket,
  QaseTicketContextBooking,
  QaseTicketContextProperty,
  QaseTicketWithContext,
} from '../../types/qase'
import { adminCardClass, formatDate, formatRelativeTime } from './adminUi'

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

function selectClassName(): string {
  return 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20'
}

function labelClass(): string {
  return 'block text-xs font-semibold uppercase tracking-wide text-gray-500'
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

  const loadAll = useCallback(async () => {
    if (!ticketId || !isSupabaseConfigured) {
      setCtx(null)
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
      setLoading(false)
      return
    }
    if (!ticketRow) {
      setError('Ticket not found.')
      setCtx(null)
      setLoading(false)
      return
    }

    const ticket = asTicket(ticketRow)

    const [{ data: msgRows, error: msgErr }, { data: catRows, error: catErr }] = await Promise.all([
      supabase.from('qase_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
      supabase
        .from('qase_fields')
        .select('*')
        .eq('field_type', 'category')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ])

    if (msgErr || catErr) {
      setError(msgErr?.message ?? catErr?.message ?? 'Failed to load related data')
    }

    const messages = (msgRows ?? []).map(asMessage)
    setCategories((catRows ?? []).map(asField))

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

  const canSendReply = useMemo(() => {
    return replyBody.trim().length > 0 && !sendingReply && !!ticketId && !!user?.id
  }, [replyBody, sendingReply, ticketId, user?.id])

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

  async function handleSendReply() {
    if (!ticketId || !user?.id || !replyBody.trim()) return
    setSendingReply(true)
    setError(null)
    const { error: insErr } = await supabase.from('qase_messages' as 'bookings').insert({
      ticket_id: ticketId,
      author_id: user.id,
      author_type: 'admin',
      body: replyBody.trim(),
      is_internal_note: replyInternal,
    } as never)
    setSendingReply(false)
    if (insErr) {
      setError(insErr.message)
      return
    }
    setReplyBody('')
    setReplyInternal(false)
    await loadAll()
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
        <>
          <header className="mt-4 mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">#{ticket.ticket_number}</h1>
            <p className="text-sm text-gray-500 mt-1">{ticket.subject}</p>
          </header>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-10">
            {/* Left: thread (~60%) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="space-y-3">
                {(ticket.messages ?? []).length === 0 ? (
                  <p className="text-sm text-gray-500 py-6">No messages yet.</p>
                ) : (
                  (ticket.messages ?? []).map((m) => (
                    <div key={m.id}>
                      {m.is_internal_note ? (
                        <div className="rounded-r-lg border border-amber-200 border-l-4 border-l-amber-400 bg-amber-50/60 px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                              Internal note
                            </span>
                            <span className="text-xs text-amber-800/80" title={m.created_at}>
                              {formatRelativeTime(m.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{m.body}</p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500 capitalize">{m.author_type}</span>
                            <span className="text-xs text-gray-400" title={m.created_at}>
                              {formatRelativeTime(m.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{m.body}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className={`${adminCardClass} space-y-3`}>
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

            {/* Right: metadata (~40%) */}
            <div className="lg:col-span-2 space-y-6">
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
                <h2 className="text-sm font-semibold text-gray-900 mb-4">AI triage</h2>
                {!ticket.ai_suggested_category?.trim() &&
                !ticket.ai_suggested_priority?.trim() &&
                !ticket.ai_draft_reply?.trim() ? (
                  <p className="text-sm text-gray-500">AI triage pending</p>
                ) : (
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
                        <p className="mt-1 text-gray-800 whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 border border-gray-100">
                          {ticket.ai_draft_reply}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
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
            </div>
          </div>
        </>
      )}
    </div>
  )
}
