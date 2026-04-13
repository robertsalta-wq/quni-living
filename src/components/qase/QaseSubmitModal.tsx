import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { QaseField } from '../../types/qase'

const TRIAGE_URL = 'https://flegysnshryzvkwzfclc.supabase.co/functions/v1/qase-triage'

function asField(row: unknown): QaseField {
  return row as QaseField
}

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

export type QaseSubmitModalProps = {
  isOpen: boolean
  onClose: () => void
  submitterType: 'student' | 'landlord'
  submitterId: string
}

export default function QaseSubmitModal({
  isOpen,
  onClose,
  submitterType,
  submitterId,
}: QaseSubmitModalProps) {
  const [subject, setSubject] = useState('')
  const [categoryKey, setCategoryKey] = useState('')
  const [message, setMessage] = useState('')
  const [categories, setCategories] = useState<QaseField[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successTicketNumber, setSuccessTicketNumber] = useState<number | null>(null)

  const resetForm = useCallback(() => {
    setSubject('')
    setCategoryKey('')
    setMessage('')
    setSubmitError(null)
    setSuccessTicketNumber(null)
  }, [])

  const loadCategories = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setCategories([])
      setCategoriesError('Support is unavailable — Supabase is not configured.')
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

  const subjectTrimmed = subject.trim()
  const messageTrimmed = message.trim()
  const subjectOk = subjectTrimmed.length > 0 && subjectTrimmed.length <= 255
  const categoryOk = categoryKey.length > 0
  const messageOk = messageTrimmed.length >= 20
  const formValid = subjectOk && categoryOk && messageOk

  const primaryBtnClass = useMemo(() => {
    if (submitterType === 'landlord') {
      return 'inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-[#e85d52] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
    }
    return 'inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  }, [submitterType])

  const inputClass =
    'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-500'
  const selectClass =
    'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-500'
  const textareaClass =
    'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-500 min-h-[7rem] resize-y'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!formValid || submitting || successTicketNumber != null) return
    if (!isSupabaseConfigured) {
      setSubmitError('Support is unavailable — Supabase is not configured.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { data: ticketRowRaw, error: ticketErr } = await supabase
        .from('qase_tickets' as 'bookings')
        .insert({
          subject: subjectTrimmed,
          category: categoryKey,
          submitted_by_type: submitterType,
          submitted_by_id: submitterId,
          received_via: 'platform_form',
          status: 'new',
          priority: 'normal',
          booking_id: null,
          property_id: null,
        } as never)
        .select('id, ticket_number')
        .single()

      const ticketRow = ticketRowRaw as unknown as { id: string; ticket_number: number } | null

      if (ticketErr || !ticketRow) {
        setSubmitError(ticketErr?.message ?? 'Could not create ticket.')
        return
      }

      const ticket = ticketRow

      const { error: msgErr } = await supabase.from('qase_messages' as 'bookings').insert({
        ticket_id: ticket.id,
        author_id: submitterId,
        author_type: submitterType,
        body: messageTrimmed,
        is_internal_note: false,
      } as never)

      if (msgErr) {
        setSubmitError(msgErr.message)
        return
      }

      fireTriage(ticket.id)
      setSuccessTicketNumber(ticket.ticket_number)
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
        className="relative z-10 max-w-lg w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qase-submit-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="qase-submit-title" className="text-lg font-bold text-gray-900">
              Get support
            </h2>
            <p className="text-sm text-gray-500 mt-1">We&apos;ll get back to you as soon as possible.</p>
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

        <div className="mt-6">
          {successTicketNumber != null ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-800">
                Your ticket has been submitted. We&apos;ll be in touch soon. Your reference is #
                {successTicketNumber}.
              </p>
              <button type="button" onClick={handleClose} className={primaryBtnClass}>
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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

              <div>
                <label htmlFor="qase-subject" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Subject <span className="text-red-600">*</span>
                </label>
                <input
                  id="qase-subject"
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
                <label htmlFor="qase-category" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Category <span className="text-red-600">*</span>
                </label>
                <select
                  id="qase-category"
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
                <label htmlFor="qase-message" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Message <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="qase-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={textareaClass}
                  placeholder="Describe your issue or question..."
                  required
                  minLength={20}
                />
                {messageTrimmed.length > 0 && messageTrimmed.length < 20 && (
                  <p className="mt-1 text-xs text-amber-700">At least 20 characters required.</p>
                )}
              </div>

              <button type="submit" disabled={!formValid || submitting || loadingCategories} className={primaryBtnClass}>
                {submitting ? 'Submitting...' : 'Submit ticket'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
