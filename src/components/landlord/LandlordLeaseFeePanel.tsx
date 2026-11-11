import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { apiUrl } from '../../lib/apiUrl'
import { formatAudFromCents } from '../../lib/pricing/leaseCharge'
import LandlordLeaseFeePay, { completeLeaseFeePayment } from './LandlordLeaseFeePay'

type ChargeRow = {
  id: string
  kind: string
  months: number
  credit_months: number
  total_cents: number
  charged_cents: number
  status: string
  invoice_storage_path: string | null
  period_start: string
}

type Props = {
  bookingId: string
  propertyId: string
  status: string
}

export default function LandlordLeaseFeePanel({ bookingId, propertyId, status }: Props) {
  const [charges, setCharges] = useState<ChargeRow[]>([])
  const [creditMonths, setCreditMonths] = useState<number | null>(null)
  const [endedOn, setEndedOn] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const finishedReturn = useRef<string | null>(null)
  const showEarlyEnd = status === 'active' || status === 'confirmed' || status === 'bond_pending'
  const paying = charges.find((charge) => charge.id === payingId) ?? null

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [{ data: chargeRows }, { data: credit }] = await Promise.all([
        supabase
          .from('listing_lease_charges')
          .select(
            'id, kind, months, credit_months, total_cents, charged_cents, status, invoice_storage_path, period_start',
          )
          .eq('booking_id', bookingId)
          .order('period_start', { ascending: true }),
        supabase.from('property_lease_credits').select('months_remaining').eq('property_id', propertyId).maybeSingle(),
      ])
      if (cancelled) return
      setCharges((chargeRows as ChargeRow[] | null) ?? [])
      setCreditMonths(credit?.months_remaining ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [bookingId, propertyId, reloadKey])

  useEffect(() => {
    const paymentIntentId = searchParams.get('payment_intent')
    const redirectStatus = searchParams.get('redirect_status')
    const chargeId = searchParams.get('leaseCharge')
    if (!paymentIntentId || redirectStatus !== 'succeeded' || !chargeId) return
    if (finishedReturn.current === paymentIntentId) return
    finishedReturn.current = paymentIntentId
    void (async () => {
      try {
        await completeLeaseFeePayment({ bookingId, chargeId, paymentIntentId })
        setMessage('Lease fee paid. The tax invoice is on its way.')
        setReloadKey((n) => n + 1)
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'The payment could not be confirmed.')
      } finally {
        const next = new URLSearchParams(searchParams)
        next.delete('payment_intent')
        next.delete('payment_intent_client_secret')
        next.delete('redirect_status')
        next.delete('leaseCharge')
        setSearchParams(next, { replace: true })
      }
    })()
  }, [bookingId, searchParams, setSearchParams])

  async function downloadInvoice(chargeId: string) {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return
    const res = await fetch(apiUrl('/api/documents/lease-charge-invoice'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, charge_id: chargeId }),
    })
    const body = (await res.json()) as { url?: string; error?: string }
    if (body.url) window.open(body.url, '_blank', 'noopener,noreferrer')
    else setMessage(body.error || 'Could not download the invoice.')
  }

  async function recordEarlyEnd() {
    setBusy(true)
    setMessage(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) return
      const res = await fetch(apiUrl('/api/booking-record-early-end'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, endedOn }),
      })
      const body = (await res.json()) as {
        error?: string
        creditMonths?: number
        monthsRemaining?: number
        alreadyRecorded?: boolean
      }
      if (!res.ok) {
        setMessage(body.error || 'Could not record the early end.')
        return
      }
      setCreditMonths(body.monthsRemaining ?? null)
      setMessage(
        body.alreadyRecorded
          ? 'This early end is already recorded.'
          : `${body.creditMonths ?? 0} unused months are now credit on this room. Credit is not a cash refund.`,
      )
    } finally {
      setBusy(false)
    }
  }

  if (charges.length === 0 && !showEarlyEnd) return null

  return (
    <section id="lease-fee" className="scroll-mt-24 rounded-admin-md border border-admin-line bg-white px-4 py-4 text-sm">
      <h3 className="text-[15px] font-semibold text-admin-ink">Lease fee</h3>
      {creditMonths != null && creditMonths > 0 ? (
        <p className="mt-1 text-admin-ink-3">{creditMonths} months of credit on this room, used before the next charge.</p>
      ) : null}
      <ul className="mt-3 space-y-2">
        {charges.map((charge) => (
          <li key={charge.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {charge.period_start} · {charge.months} months
              {charge.credit_months > 0 ? ` (${charge.credit_months} months credit)` : ''} ·{' '}
              {formatAudFromCents(charge.total_cents)} · {charge.status}
            </span>
            {charge.status === 'failed' ? (
              <button
                type="button"
                className="rounded-full bg-admin-coral px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setPayingId(charge.id)}
              >
                Pay now
              </button>
            ) : null}
            {charge.invoice_storage_path ? (
              <button
                type="button"
                className="font-semibold text-admin-coral underline"
                onClick={() => void downloadInvoice(charge.id)}
              >
                Download tax invoice
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {showEarlyEnd ? (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            void recordEarlyEnd()
          }}
        >
          <label className="text-xs text-admin-ink-4">
            Lease ended early
            <input
              type="date"
              required
              value={endedOn}
              onChange={(event) => setEndedOn(event.target.value)}
              className="mt-1 block rounded-md border border-admin-line px-2 py-1 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-admin-coral px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Record early end'}
          </button>
        </form>
      ) : null}
      {message ? <p className="mt-2 text-admin-ink-3">{message}</p> : null}
      {paying ? (
        <LandlordLeaseFeePay
          bookingId={bookingId}
          chargeId={paying.id}
          amountLabel={formatAudFromCents(paying.charged_cents || paying.total_cents)}
          onClose={() => setPayingId(null)}
          onPaid={() => {
            setPayingId(null)
            setMessage('Lease fee paid. The tax invoice is on its way.')
            setReloadKey((n) => n + 1)
          }}
        />
      ) : null}
    </section>
  )
}
