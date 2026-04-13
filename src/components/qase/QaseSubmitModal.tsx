import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { QaseField } from '../../types/qase'

const TRIAGE_URL = 'https://flegysnshryzvkwzfclc.supabase.co/functions/v1/qase-triage'

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
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const [attachmentValidationError, setAttachmentValidationError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [successAttachmentWarning, setSuccessAttachmentWarning] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setSubject('')
    setCategoryKey('')
    setMessage('')
    setSubmitError(null)
    setSuccessTicketNumber(null)
    setAttachmentFiles([])
    setAttachmentValidationError(null)
    setUploadProgress(null)
    setSuccessAttachmentWarning(null)
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
  const formValid = subjectOk && categoryOk && messageOk && !attachmentValidationError

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

  function handleAttachmentInputChange(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files
    e.target.value = ''
    if (!list?.length) return
    const incoming = Array.from(list)
    const merged = [...attachmentFiles, ...incoming]
    if (merged.length > MAX_ATTACHMENT_FILES) {
      const slice = merged.slice(0, MAX_ATTACHMENT_FILES)
      setAttachmentFiles(slice)
      const sliceErr = validateAttachmentList(slice)
      setAttachmentValidationError(
        sliceErr ?? `You can attach at most ${MAX_ATTACHMENT_FILES} files.`,
      )
      return
    }
    const err = validateAttachmentList(merged)
    if (err) {
      setAttachmentValidationError(err)
      return
    }
    setAttachmentFiles(merged)
    setAttachmentValidationError(null)
  }

  function removeAttachmentAt(index: number) {
    const next = attachmentFiles.filter((_, i) => i !== index)
    setAttachmentFiles(next)
    setAttachmentValidationError(validateAttachmentList(next))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!formValid || submitting || successTicketNumber != null) return
    if (!isSupabaseConfigured) {
      setSubmitError('Support is unavailable — Supabase is not configured.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    setSuccessAttachmentWarning(null)
    setUploadProgress(null)
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

      const { data: msgRowRaw, error: msgErr } = await supabase
        .from('qase_messages' as 'bookings')
        .insert({
          ticket_id: ticket.id,
          author_id: submitterId,
          author_type: submitterType,
          body: messageTrimmed,
          is_internal_note: false,
        } as never)
        .select('id')
        .single()

      const msgRow = msgRowRaw as unknown as { id: string } | null

      if (msgErr || !msgRow?.id) {
        setSubmitError(msgErr?.message ?? 'Could not create message.')
        return
      }

      const messageId = msgRow.id

      fireTriage(ticket.id)

      const files = attachmentFiles
      const failures: string[] = []
      if (files.length > 0) {
        setUploadProgress({ current: 0, total: files.length })
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          setUploadProgress({ current: i + 1, total: files.length })
          const safeName = sanitizeFileName(file.name)
          const path = `${ticket.id}/${Date.now()}-${i}-${safeName}`
          const mime = file.type && ALLOWED_MIME.has(file.type) ? file.type : 'application/octet-stream'

          const { error: upErr } = await supabase.storage.from('qase-attachments').upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: mime,
          })

          if (upErr) {
            console.error('Qase attachment upload', upErr)
            failures.push(file.name)
            continue
          }

          const { error: attErr } = await supabase.from('qase_attachments' as 'bookings').insert({
            ticket_id: ticket.id,
            message_id: messageId,
            file_name: file.name,
            file_path: path,
            file_size: file.size,
            mime_type: mime,
            uploaded_by_id: submitterId,
            uploaded_by_type: submitterType,
          } as never)

          if (attErr) {
            console.error('Qase attachment row', attErr)
            failures.push(file.name)
            void supabase.storage.from('qase-attachments').remove([path])
          }
        }
        setUploadProgress(null)
      }

      if (failures.length > 0) {
        setSuccessAttachmentWarning(
          `Your ticket was created, but some attachments could not be uploaded: ${failures.join(', ')}.`,
        )
      }

      setSuccessTicketNumber(ticket.ticket_number)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
      setUploadProgress(null)
    }
  }

  function handleClose() {
    if (submitting) return
    onClose()
  }

  if (!isOpen) return null

  const submitLabel =
    submitting && uploadProgress
      ? `Uploading attachments (${uploadProgress.current}/${uploadProgress.total})...`
      : submitting
        ? 'Submitting...'
        : 'Submit ticket'

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
              {successAttachmentWarning && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" role="alert">
                  {successAttachmentWarning}
                </p>
              )}
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

              <div>
                <label htmlFor="qase-attachments" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Attachments (optional)
                </label>
                <input
                  id="qase-attachments"
                  type="file"
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  onChange={handleAttachmentInputChange}
                  disabled={submitting || loadingCategories}
                  className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-800 hover:file:bg-gray-200"
                />
                <p className="mt-1 text-xs text-gray-400">Up to 10 files, 20MB each.</p>
                {attachmentValidationError && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {attachmentValidationError}
                  </p>
                )}
                {attachmentFiles.length > 0 && (
                  <ul className="mt-2 space-y-2 border border-gray-100 rounded-xl p-3 bg-gray-50/80">
                    {attachmentFiles.map((f, idx) => (
                      <li key={`${f.name}-${f.size}-${idx}`} className="flex items-start justify-between gap-2 text-sm">
                        <span className="min-w-0 break-words text-gray-800">
                          {f.name}{' '}
                          <span className="text-gray-500">({formatFileSize(f.size)})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachmentAt(idx)}
                          disabled={submitting}
                          className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {submitting && uploadProgress && (
                <p className="text-sm text-gray-600" aria-live="polite">
                  Uploading attachments ({uploadProgress.current}/{uploadProgress.total})...
                </p>
              )}

              <button type="submit" disabled={!formValid || submitting || loadingCategories} className={primaryBtnClass}>
                {submitLabel}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
