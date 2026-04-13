import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthContext } from '../../context/AuthContext'
import type { QaseField, QasePriority, QaseSubmitterType } from '../../types/qase'

const TRIAGE_URL = 'https://flegysnshryzvkwzfclc.supabase.co/functions/v1/qase-triage'

const PRIORITIES: QasePriority[] = ['urgent', 'high', 'normal', 'low']

const SUBMITTER_DEBOUNCE_MS = 400

function fireTriage(ticketId: string): void {
  const secret = import.meta.env.VITE_QASE_INTERNAL_SECRET
  if (typeof secret !== 'string' || !secret.trim()) return
  void fetch(TRIAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-qase-internal': secret.trim(),
    },
    body: JSON.stringify({ ticket_id: ticketId }),
  }).catch(() => {})
}

function asField(row: unknown): QaseField {
  return row as QaseField
}

function sanitizeIlikeTerm(raw: string): string {
  return raw.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim()
}

function studentDisplayName(r: {
  full_name: string | null
  first_name: string | null
  last_name: string | null
}): string {
  if (r.full_name?.trim()) return r.full_name.trim()
  const fn = r.first_name?.trim() ?? ''
  const ln = r.last_name?.trim() ?? ''
  const c = `${fn} ${ln}`.trim()
  return c || 'Student'
}

function landlordDisplayName(r: { full_name: string | null; company_name: string | null }): string {
  return r.full_name?.trim() || r.company_name?.trim() || 'Landlord'
}

export type SubmitterPick = {
  kind: 'student' | 'landlord'
  id: string
  name: string
  email: string
}

export type QaseAdminCreateModalProps = {
  isOpen: boolean
  onClose: () => void
  onCreated: (ticketId: string) => void
}

function hitBadgeClass(kind: 'student' | 'landlord'): string {
  return kind === 'student' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'
}

export default function QaseAdminCreateModal({ isOpen, onClose, onCreated }: QaseAdminCreateModalProps) {
  const { user } = useAuthContext()
  const [subject, setSubject] = useState('')
  const [categoryKey, setCategoryKey] = useState('')
  const [priority, setPriority] = useState<QasePriority>('normal')
  const [message, setMessage] = useState('')
  const [categories, setCategories] = useState<QaseField[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [submitterSearch, setSubmitterSearch] = useState('')
  const [debouncedSubmitterSearch, setDebouncedSubmitterSearch] = useState('')
  const [submitterHits, setSubmitterHits] = useState<SubmitterPick[]>([])
  const [submitterSearchLoading, setSubmitterSearchLoading] = useState(false)
  const [selectedSubmitter, setSelectedSubmitter] = useState<SubmitterPick | null>(null)

  const searchSeq = useRef(0)

  const resetForm = useCallback(() => {
    setSubject('')
    setCategoryKey('')
    setPriority('normal')
    setMessage('')
    setSubmitError(null)
    setSubmitterSearch('')
    setDebouncedSubmitterSearch('')
    setSubmitterHits([])
    setSubmitterSearchLoading(false)
    setSelectedSubmitter(null)
  }, [])

  const loadCategories = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setCategories([])
      setCategoriesError('Supabase is not configured.')
      return
    }
    setLoadingCategories(true)
    setCategoriesError(null)
    const { data, error } = await supabase
      .from('qase_fields')
      .select('*')
      .eq('field_type', 'category')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    setLoadingCategories(false)
    if (error) {
      setCategories([])
      setCategoriesError(error.message)
      return
    }
    setCategories((data ?? []).map(asField))
  }, [])

  useEffect(() => {
    if (!isOpen) return
    resetForm()
    void loadCategories()
  }, [isOpen, loadCategories, resetForm])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSubmitterSearch(submitterSearch.trim()), SUBMITTER_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [submitterSearch])

  useEffect(() => {
    if (!isOpen || !isSupabaseConfigured || selectedSubmitter) {
      setSubmitterHits([])
      setSubmitterSearchLoading(false)
      return
    }
    const inner = sanitizeIlikeTerm(debouncedSubmitterSearch)
    if (inner.length === 0) {
      setSubmitterHits([])
      setSubmitterSearchLoading(false)
      return
    }

    const seq = ++searchSeq.current
    setSubmitterSearchLoading(true)
    const pattern = `%${inner}%`
    const studentOr = `full_name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`
    const landlordOr = `full_name.ilike.${pattern},email.ilike.${pattern},company_name.ilike.${pattern}`

    void (async () => {
      const [stuRes, llRes] = await Promise.all([
        supabase
          .from('student_profiles')
          .select('id, full_name, first_name, last_name, email')
          .or(studentOr)
          .limit(8),
        supabase
          .from('landlord_profiles')
          .select('id, full_name, email, company_name')
          .or(landlordOr)
          .limit(8),
      ])

      if (seq !== searchSeq.current) return
      setSubmitterSearchLoading(false)

      const hits: SubmitterPick[] = []
      for (const row of stuRes.data ?? []) {
        const r = row as {
          id: string
          full_name: string | null
          first_name: string | null
          last_name: string | null
          email: string | null
        }
        hits.push({
          kind: 'student',
          id: r.id,
          name: studentDisplayName(r),
          email: r.email?.trim() || '—',
        })
      }
      for (const row of llRes.data ?? []) {
        const r = row as { id: string; full_name: string | null; email: string | null; company_name: string | null }
        hits.push({
          kind: 'landlord',
          id: r.id,
          name: landlordDisplayName(r),
          email: r.email?.trim() || '—',
        })
      }
      setSubmitterHits(hits.slice(0, 12))
    })()
  }, [debouncedSubmitterSearch, isOpen, selectedSubmitter])

  const subjectTrimmed = subject.trim()
  const messageTrimmed = message.trim()
  const subjectOk = subjectTrimmed.length > 0 && subjectTrimmed.length <= 255
  const categoryOk = categoryKey.length > 0
  const messageOk = messageTrimmed.length >= 10
  const formValid = subjectOk && categoryOk && messageOk && !!user?.id && !loadingCategories

  const primaryBtnClass =
    'inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'

  const inputClass =
    'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-500'
  const selectClass =
    'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-500'
  const textareaClass =
    'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-500 min-h-[6rem] resize-y'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!formValid || submitting || !user?.id) return
    if (!isSupabaseConfigured) {
      setSubmitError('Supabase is not configured.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const submittedByType: QaseSubmitterType = selectedSubmitter
        ? selectedSubmitter.kind
        : 'admin'
      const submittedById = selectedSubmitter ? selectedSubmitter.id : null

      const { data: ticketRowRaw, error: ticketErr } = await supabase
        .from('qase_tickets' as 'bookings')
        .insert({
          subject: subjectTrimmed,
          category: categoryKey,
          submitted_by_type: submittedByType,
          submitted_by_id: submittedById,
          received_via: 'platform_form',
          status: 'new',
          priority,
          booking_id: null,
          property_id: null,
        } as never)
        .select('id')
        .single()

      const ticketRow = ticketRowRaw as unknown as { id: string } | null

      if (ticketErr || !ticketRow?.id) {
        setSubmitError(ticketErr?.message ?? 'Could not create ticket.')
        return
      }

      const ticketId = ticketRow.id

      const { error: msgErr } = await supabase.from('qase_messages' as 'bookings').insert({
        ticket_id: ticketId,
        author_id: user.id,
        author_type: 'admin',
        body: messageTrimmed,
        is_internal_note: false,
      } as never)

      if (msgErr) {
        setSubmitError(msgErr.message)
        return
      }

      fireTriage(ticketId)
      onCreated(ticketId)
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    if (submitting) return
    onClose()
  }

  const showSubmitterDropdown =
    !selectedSubmitter && debouncedSubmitterSearch.length > 0 && (submitterSearchLoading || submitterHits.length > 0)

  const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-gray-500'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={handleClose}
        disabled={submitting}
      />
      <div
        className="relative z-10 max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qase-admin-create-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="qase-admin-create-title" className="text-lg font-bold text-gray-900">
              New support ticket
            </h2>
            <p className="text-sm text-gray-500 mt-1">Create a ticket on behalf of a user or as staff-only.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="shrink-0 rounded-lg p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          {categoriesError && (
            <p className="text-sm text-red-600" role="alert">
              {categoriesError}
            </p>
          )}
          {submitError && (
            <p className="text-sm text-red-600" role="alert">
              {submitError}
            </p>
          )}
          {!user?.id && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" role="alert">
              You must be signed in to create a ticket.
            </p>
          )}

          <div>
            <label htmlFor="qase-admin-subject" className={labelClass}>
              Subject <span className="text-red-600">*</span>
            </label>
            <input
              id="qase-admin-subject"
              type="text"
              maxLength={255}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClass}
              required
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-gray-400">{subjectTrimmed.length}/255</p>
          </div>

          <div>
            <label htmlFor="qase-admin-category" className={labelClass}>
              Category <span className="text-red-600">*</span>
            </label>
            <select
              id="qase-admin-category"
              value={categoryKey}
              onChange={(e) => setCategoryKey(e.target.value)}
              className={selectClass}
              disabled={loadingCategories}
              required
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.field_key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="qase-admin-priority" className={labelClass}>
              Priority
            </label>
            <select
              id="qase-admin-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as QasePriority)}
              className={selectClass}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="qase-admin-message" className={labelClass}>
              Message <span className="text-red-600">*</span>
            </label>
            <textarea
              id="qase-admin-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={textareaClass}
              placeholder="Initial thread message…"
              required
              minLength={10}
            />
            {messageTrimmed.length > 0 && messageTrimmed.length < 10 && (
              <p className="mt-1 text-xs text-amber-700">At least 10 characters required.</p>
            )}
          </div>

          <div className="relative">
            <span className={labelClass}>Submitter (optional)</span>
            {selectedSubmitter ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <div className="min-w-0 text-sm">
                  <span className={`mr-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${hitBadgeClass(selectedSubmitter.kind)}`}>
                    {selectedSubmitter.kind === 'student' ? 'Student' : 'Landlord'}
                  </span>
                  <span className="font-medium text-gray-900">{selectedSubmitter.name}</span>
                  <span className="text-gray-500"> · {selectedSubmitter.email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubmitter(null)
                    setSubmitterSearch('')
                    setDebouncedSubmitterSearch('')
                    setSubmitterHits([])
                  }}
                  className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-800"
                >
                  Clear
                </button>
              </div>
            ) : (
              <>
                <input
                  id="qase-admin-submitter-search"
                  type="search"
                  value={submitterSearch}
                  onChange={(e) => setSubmitterSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  autoComplete="off"
                  className={inputClass}
                />
                {showSubmitterDropdown ? (
                  <ul
                    className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                    role="listbox"
                  >
                    {submitterSearchLoading ? (
                      <li className="flex justify-center py-6">
                        <div className="h-7 w-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      </li>
                    ) : (
                      submitterHits.map((hit) => (
                        <li key={`${hit.kind}-${hit.id}`} role="option">
                          <button
                            type="button"
                            className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                            onClick={() => {
                              setSelectedSubmitter(hit)
                              setSubmitterSearch('')
                              setDebouncedSubmitterSearch('')
                              setSubmitterHits([])
                            }}
                          >
                            <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${hitBadgeClass(hit.kind)}`}>
                              {hit.kind === 'student' ? 'Student' : 'Landlord'}
                            </span>
                            <span className="min-w-0">
                              <span className="font-medium text-gray-900">{hit.name}</span>
                              <span className="block text-xs text-gray-500">{hit.email}</span>
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button type="submit" disabled={!formValid || submitting} className={primaryBtnClass}>
              {submitting ? 'Creating…' : 'Create ticket'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
