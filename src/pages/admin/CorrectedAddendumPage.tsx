import { useState } from 'react'
import { AdminPageHeader } from '../../components/admin/primitives'
import { supabase } from '../../lib/supabase'

type Preview = {
  hasPayee: boolean
  pdfBase64: string
}

export default function CorrectedAddendumPage() {
  const [bookingId, setBookingId] = useState('')
  const [busy, setBusy] = useState<'preview' | 'send' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [sentId, setSentId] = useState<string | null>(null)

  async function post(send: boolean) {
    setBusy(send ? 'send' : 'preview')
    setError(null)
    setSentId(null)
    if (!send) setPreview(null)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('You need to be signed in.')
      const resp = await fetch('/api/admin/corrected-payee-addendum', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: bookingId.trim(), send }),
      })
      const body = (await resp.json()) as { error?: string; hasPayee?: boolean; pdfBase64?: string; submissionId?: string }
      if (!resp.ok) throw new Error(body.error || 'Could not build the addendum.')
      if (send) {
        setSentId(body.submissionId || 'sent')
        return
      }
      if (!body.pdfBase64) throw new Error('The preview PDF was empty.')
      setPreview({ hasPayee: Boolean(body.hasPayee), pdfBase64: body.pdfBase64 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the addendum.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Corrected addendum"
        subtitle="A short addendum for an agreement that still names a platform account or a platform fee. Preview does not email anyone. Send asks both parties to sign through DocuSeal."
      />
      <form
        className="max-w-xl space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void post(false)
        }}
      >
        <label className="block text-sm text-admin-ink">
          Booking id
          <input
            value={bookingId}
            onChange={(event) => setBookingId(event.target.value)}
            className="mt-1 w-full rounded-md border border-admin-line bg-white px-3 py-2 text-sm"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            required
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy !== null}
            className="rounded-md bg-admin-ink px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {busy === 'preview' ? 'Building...' : 'Preview PDF'}
          </button>
          <button
            type="button"
            disabled={busy !== null || !preview?.hasPayee}
            className="rounded-md border border-admin-line px-3 py-2 text-sm disabled:opacity-60"
            onClick={() => void post(true)}
          >
            {busy === 'send' ? 'Sending...' : 'Send for signature'}
          </button>
        </div>
      </form>
      {error ? <p className="mt-4 text-sm text-admin-danger-fg">{error}</p> : null}
      {preview && !preview.hasPayee ? (
        <p className="mt-4 text-sm text-admin-warning-fg">
          Payee bank details are not on file. You can read the preview. Sending stays off until the property has an account.
        </p>
      ) : null}
      {preview ? (
        <p className="mt-4 text-sm">
          <a
            className="underline"
            href={`data:application/pdf;base64,${preview.pdfBase64}`}
            download={`corrected-addendum-${bookingId.trim().slice(0, 8)}.pdf`}
          >
            Download preview
          </a>
        </p>
      ) : null}
      {sentId ? <p className="mt-4 text-sm text-admin-ink">Sent for signature. Submission {sentId}.</p> : null}
    </div>
  )
}
