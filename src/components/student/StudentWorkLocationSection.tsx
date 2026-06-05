import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Database } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import { geocodeFirstMatch } from '../../lib/geocodeClient'
import {
  STRAIGHT_LINE_DISTANCE_NOTE,
  hasSavedWorkplaceCoordinates,
  workplaceGeocodeQueries,
} from '../../lib/workplaceLocation'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 focus:border-[#FF6F61]'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

type Props = {
  profile: StudentRow
  userId: string
  onSaved: () => void | Promise<void>
}

export function StudentWorkLocationSection({ profile, userId, onSaved }: Props) {
  const [label, setLabel] = useState(profile.workplace_label ?? '')
  const [address, setAddress] = useState(profile.workplace_address ?? '')
  const [suburb, setSuburb] = useState(profile.workplace_suburb ?? '')
  const [state, setState] = useState(profile.workplace_state ?? 'NSW')
  const [postcode, setPostcode] = useState(profile.workplace_postcode ?? '')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    setLabel(profile.workplace_label ?? '')
    setAddress(profile.workplace_address ?? '')
    setSuburb(profile.workplace_suburb ?? '')
    setState(profile.workplace_state ?? 'NSW')
    setPostcode(profile.workplace_postcode ?? '')
  }, [profile])

  const hasCoords = hasSavedWorkplaceCoordinates(profile)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaveError(null)
    setSavedFlash(false)

    const sub = suburb.trim()
    const st = state.trim().toUpperCase()
    const pc = postcode.trim()
    if (!sub || !st || !pc) {
      setSaveError('Suburb, state and postcode are required.')
      return
    }

    setSaving(true)
    try {
      const queries = workplaceGeocodeQueries({
        address: address.trim() || null,
        suburb: sub,
        state: st,
        postcode: pc,
      })
      if (queries.length === 0) {
        setSaveError('Enter a valid Australian suburb, state and postcode.')
        return
      }

      const pt = await geocodeFirstMatch(queries)
      if (!pt) {
        setSaveError(
          'We could not find that location. Check suburb, state and postcode - add a street address for a more precise pin.',
        )
        return
      }

      const nowIso = new Date().toISOString()
      const { error } = await supabase
        .from('student_profiles')
        .update({
          workplace_label: label.trim() || null,
          workplace_address: address.trim() || null,
          workplace_suburb: sub,
          workplace_state: st,
          workplace_postcode: pc,
          workplace_latitude: pt.lat,
          workplace_longitude: pt.lon,
          workplace_geocoded_at: nowIso,
        })
        .eq('user_id', userId)

      if (error) {
        if (/column|schema cache/i.test(error.message)) {
          setSaveError(
            'Work location needs a database update. Run supabase/migrations/20260602120000_workplace_location_and_near_point.sql in Supabase.',
          )
        } else {
          setSaveError(error.message)
        }
        return
      }

      setSavedFlash(true)
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">Work location</h2>
      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
        Optional. Save where you work or commute from - used to sort listings by approximate distance.{' '}
        {STRAIGHT_LINE_DISTANCE_NOTE}
      </p>

      {hasCoords && (
        <p className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          Saved
          {profile.workplace_suburb ? (
            <>
              {' '}
              near <span className="font-medium">{profile.workplace_suburb}</span>
              {profile.workplace_state ? `, ${profile.workplace_state}` : ''}
            </>
          ) : null}
          .{' '}
          <Link to="/listings" className="font-semibold text-[#FF6F61] underline underline-offset-2">
            Browse nearby listings
          </Link>
        </p>
      )}

      <form onSubmit={handleSave} className="mt-4 space-y-4">
        <div>
          <label htmlFor="wl-label" className={labelClass}>
            Label <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="wl-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Martin Place office"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="wl-addr" className={labelClass}>
            Street address <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="wl-addr"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 1 Martin Place or UNSW Kensington"
            className={inputClass}
            autoComplete="street-address"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label htmlFor="wl-sub" className={labelClass}>
              Suburb
            </label>
            <input
              id="wl-sub"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              required
              className={inputClass}
              autoComplete="address-level2"
            />
          </div>
          <div>
            <label htmlFor="wl-st" className={labelClass}>
              State
            </label>
            <select
              id="wl-st"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
              className={inputClass}
            >
              {AU_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="wl-pc" className={labelClass}>
              Postcode
            </label>
            <input
              id="wl-pc"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              required
              inputMode="numeric"
              className={inputClass}
              autoComplete="postal-code"
            />
          </div>
        </div>

        {saveError && (
          <p className="text-sm text-red-600" role="alert">
            {saveError}
          </p>
        )}
        {savedFlash && !saveError && (
          <p className="text-sm text-emerald-700" role="status">
            Work location saved.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#FF6F61] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save work location'}
        </button>
      </form>
    </section>
  )
}
