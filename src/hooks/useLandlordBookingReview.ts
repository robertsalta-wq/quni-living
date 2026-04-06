import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { buildBookingFitSummary } from '../lib/bookingFitSummary'

type BookingRow = Database['public']['Tables']['bookings']['Row']
type StudentRow = Database['public']['Tables']['student_profiles']['Row']
type MessageRow = Database['public']['Tables']['booking_messages']['Row']

export type LandlordBookingReviewProperty = Database['public']['Tables']['properties']['Row'] & {
  property_features?: { features?: { name?: string | null } | null }[] | null
}

export type LandlordBookingReviewStudent = (StudentRow & { universities?: { name: string } | null }) | null

export type LandlordBookingReviewTenancy = Pick<
  Database['public']['Tables']['tenancies']['Row'],
  'id' | 'bond_lodged_at' | 'bond_amount' | 'bond_lodgement_reference'
>

export type LandlordBookingReviewData = {
  booking: BookingRow
  property: LandlordBookingReviewProperty | null
  student: LandlordBookingReviewStudent
  messages: MessageRow[]
  landlordStripeReady: boolean
  fitRows: ReturnType<typeof buildBookingFitSummary>
  /** Other students with pending_confirmation / awaiting_info on the same property (excludes this booking). */
  otherPendingPipelineCount: number
  /** Present once a tenancy row exists for this booking (e.g. after confirmation / lease flow). */
  tenancy: LandlordBookingReviewTenancy | null
}

function formatReceivedAgo(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const ms = Date.now() - t
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'Received just now'
  if (m < 60) return `Received ${m} minute${m === 1 ? '' : 's'} ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `Received ${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.floor(h / 24)
  return `Received ${d} day${d === 1 ? '' : 's'} ago`
}

export function bookingReferenceLabel(bookingId: string): string {
  return bookingId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export function useLandlordBookingReview(bookingId: string | undefined, landlordUserId: string | undefined) {
  const [data, setData] = useState<LandlordBookingReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [receivedAgo, setReceivedAgo] = useState('')

  const load = useCallback(async () => {
    if (!bookingId?.trim() || !landlordUserId) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data: lp, error: lpErr } = await supabase
        .from('landlord_profiles')
        .select('id, stripe_charges_enabled, stripe_connect_account_id')
        .eq('user_id', landlordUserId)
        .maybeSingle()

      if (lpErr || !lp) {
        setError('Landlord profile not found.')
        setData(null)
        return
      }

      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .select(
          `
          *,
          properties (
            *,
            property_features ( features ( name ) )
          ),
          student_profiles (
            *,
            universities ( name )
          )
        `,
        )
        .eq('id', bookingId.trim())
        .maybeSingle()

      if (bErr) {
        setError(bErr.message || 'Could not load booking.')
        setData(null)
        return
      }

      if (!booking) {
        setError('Booking not found.')
        setData(null)
        return
      }

      if (booking.landlord_id !== lp.id) {
        setError('You do not have access to this booking.')
        setData(null)
        return
      }

      const { data: msgs, error: mErr } = await supabase
        .from('booking_messages')
        .select('*')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: true })

      if (mErr) {
        setError(mErr.message || 'Could not load messages.')
        setData(null)
        return
      }

      const prop =
        booking.properties && typeof booking.properties === 'object'
          ? (booking.properties as LandlordBookingReviewProperty)
          : null
      const st =
        booking.student_profiles && typeof booking.student_profiles === 'object'
          ? (booking.student_profiles as StudentRow & { universities?: { name: string } | null })
          : null

      const fitStudent = {
        occupancy_type: st?.occupancy_type ?? null,
        move_in_flexibility: st?.move_in_flexibility ?? null,
        has_pets: st?.has_pets ?? null,
        needs_parking: st?.needs_parking ?? null,
        bills_preference: st?.bills_preference ?? null,
        furnishing_preference: st?.furnishing_preference ?? null,
      }

      const fitRows = buildBookingFitSummary({
        booking,
        student: fitStudent,
        property: prop,
      })

      const stripeReady = lp.stripe_charges_enabled === true && Boolean(lp.stripe_connect_account_id?.trim())

      let otherPendingPipelineCount = 0
      if (booking.property_id) {
        const { count, error: cntErr } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', booking.property_id)
          .neq('id', booking.id)
          .in('status', ['pending_confirmation', 'awaiting_info'])
        if (!cntErr && typeof count === 'number') otherPendingPipelineCount = count
      }

      const { data: tenancyRow } = await supabase
        .from('tenancies')
        .select('id, bond_lodged_at, bond_amount, bond_lodgement_reference')
        .eq('booking_id', booking.id)
        .maybeSingle()

      setData({
        booking: booking as BookingRow,
        property: prop,
        student: st,
        messages: (msgs ?? []) as MessageRow[],
        landlordStripeReady: stripeReady,
        fitRows,
        otherPendingPipelineCount,
        tenancy: (tenancyRow as LandlordBookingReviewTenancy | null) ?? null,
      })
      setReceivedAgo(formatReceivedAgo(booking.created_at))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [bookingId, landlordUserId])

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, error, reload: load, receivedAgo }
}
