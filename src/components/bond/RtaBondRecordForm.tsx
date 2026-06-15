import { useCallback, useEffect, useState } from 'react'
import { apiUrl } from '../../lib/apiUrl'
import { supabase } from '../../lib/supabase'

type Props = {
  bookingId: string
  initialBondNumber?: string | null
  initialAckRef?: string | null
  initialLodgedDate?: string | null
  compact?: boolean
}

export default function RtaBondRecordForm({
  bookingId,
  initialBondNumber,
  initialAckRef,
  initialLodgedDate,
  compact = false,
}: Props) {
  const [rtaBondNumber, setRtaBondNumber] = useState(initialBondNumber ?? '')
  const [rtaAckRef, setRtaAckRef] = useState(initialAckRef ?? '')
  const [rtaLodgedDate, setRtaLodgedDate] = useState(initialLodgedDate ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setRtaBondNumber(initialBondNumber ?? '')
    setRtaAckRef(initialAckRef ?? '')
    setRtaLodgedDate(initialLodgedDate ?? '')
  }, [initialAckRef, initialBondNumber, initialLodgedDate, bookingId])

  const onSave = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setError('Sign in to save RTA bond details.')
        return
      }
      const res = await fetch(apiUrl('/api/booking-record-rta-bond'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId,
          rtaBondNumber: rtaBondNumber.trim() || null,
          rtaAcknowledgementReference: rtaAckRef.trim() || null,
          rtaBondLodgedAt: rtaLodgedDate.trim() || null,
        }),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Could not save.')
        return
      }
      setToast('Saved.')
      window.setTimeout(() => setToast(null), 4000)
    } catch {
      setError('Something went wrong.')
    } finally {
      setBusy(false)
    }
  }, [bookingId, rtaAckRef, rtaBondNumber, rtaLodgedDate])

  return (
    <div className={`rounded-xl border border-gray-200 bg-white space-y-3 ${compact ? 'p-3' : 'p-4'}`}>
      <p className={`font-semibold text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>
        RTA bond record (optional)
      </p>
      <p className="text-xs text-gray-600 leading-relaxed">
        If you lodged with the RTA, save your bond number from the Acknowledgement of Rental Bond. This does not gate
        your booking.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={rtaBondNumber}
          onChange={(e) => setRtaBondNumber(e.target.value)}
          placeholder="RTA bond number"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={rtaAckRef}
          onChange={(e) => setRtaAckRef(e.target.value)}
          placeholder="Acknowledgement reference"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={rtaLodgedDate}
          onChange={(e) => setRtaLodgedDate(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm sm:col-span-2 sm:max-w-xs"
        />
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {toast ? <p className="text-xs text-emerald-800">{toast}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void onSave()}
        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'Save RTA bond details'}
      </button>
    </div>
  )
}
