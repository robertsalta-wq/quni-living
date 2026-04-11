import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { formatLogValue } from '../../lib/adminPricingSupabase'
import type { PlatformConfigRow } from '../../lib/platformConfig'
import { PLATFORM_CONFIG_KEYS } from '../../lib/platformConfig'
import { adminCardClass } from './adminUi'

const CHANGELOG_REDACTED = '[redacted]'

const CATEGORY_LABEL: Record<string, string> = {
  business: 'Business',
  bank: 'Bank details',
  compliance: 'Compliance',
  documents: 'Documents',
  payments: 'Payments',
}

function isGstDetailKey(configKey: string): boolean {
  return (
    configKey === PLATFORM_CONFIG_KEYS.BUSINESS_GST_RATE ||
    configKey === PLATFORM_CONFIG_KEYS.BUSINESS_GST_REGISTRATION_DATE
  )
}

function categoryLabel(cat: string): string {
  return CATEGORY_LABEL[cat] ?? cat.replace(/\b\w/g, (c) => c.toUpperCase())
}

function rowsByCategory(rows: PlatformConfigRow[]): Map<string, PlatformConfigRow[]> {
  const m = new Map<string, PlatformConfigRow[]>()
  for (const r of rows) {
    const list = m.get(r.category) ?? []
    list.push(r)
    m.set(r.category, list)
  }
  return m
}

export default function AdminSettings() {
  const { user } = useAuthContext()
  const [rows, setRows] = useState<PlatformConfigRow[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const gstRegistered =
    (draft[PLATFORM_CONFIG_KEYS.BUSINESS_GST_REGISTERED] ?? 'false').toLowerCase() === 'true'

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: qErr } = await supabase
        .from('platform_config')
        .select('*')
        .order('category')
        .order('sort_order')
      if (qErr) throw qErr
      const list = (data ?? []) as PlatformConfigRow[]
      setRows(list)
      const d: Record<string, string> = {}
      for (const r of list) d[r.config_key] = r.config_value ?? ''
      setDraft(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visibleCategories = useMemo(() => {
    const map = rowsByCategory(rows)
    const order = ['business', 'bank', 'compliance', 'documents', 'payments']
    return order.filter((cat) => (map.get(cat)?.length ?? 0) > 0)
  }, [rows])

  function setField(key: string, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  async function saveCategory(category: string) {
    if (!isSupabaseConfigured || !user?.email) return
    setSaving(true)
    setError(null)
    setMessage(null)
    const changedBy = user.email
    const map = rowsByCategory(rows)
    const catRows = map.get(category) ?? []

    try {
      for (const row of catRows) {
        if (isGstDetailKey(row.config_key) && !gstRegistered) continue

        const prevVal = row.config_value ?? ''
        const nextVal = draft[row.config_key] ?? ''
        if (prevVal === nextVal) continue

        let logOld = formatLogValue(prevVal)
        let logNew = formatLogValue(nextVal)
        if (row.is_sensitive) {
          logOld = CHANGELOG_REDACTED
          logNew = CHANGELOG_REDACTED
        }

        const { error: uErr } = await supabase
          .from('platform_config')
          .update({ config_value: nextVal, updated_by: changedBy })
          .eq('id', row.id)
        if (uErr) throw uErr

        const { error: lErr } = await supabase.from('pricing_change_log').insert({
          tier: null,
          field_name: row.config_key,
          old_value: logOld,
          new_value: logNew,
          changed_by: changedBy,
        })
        if (lErr) throw lErr
      }

      setMessage(`Saved ${categoryLabel(category)}.`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Business settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Legal, contact, bank, and compliance values used by the platform and tenancy documents. Sensitive bank fields
          are audited as <span className="font-mono text-xs">{CHANGELOG_REDACTED}</span> in the pricing change log.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      {visibleCategories.map((cat) => {
        const map = rowsByCategory(rows)
        const catRows = map.get(cat) ?? []
        return (
          <section key={cat} className={adminCardClass}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{categoryLabel(cat)}</h2>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveCategory(cat)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Save {categoryLabel(cat)}
              </button>
            </div>
            <div className="space-y-4">
              {catRows.map((row) => {
                if (isGstDetailKey(row.config_key) && !gstRegistered) return null

                if (row.config_key === PLATFORM_CONFIG_KEYS.BUSINESS_GST_REGISTERED) {
                  return (
                    <label key={row.id} className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                        checked={gstRegistered}
                        onChange={(e) =>
                          setField(row.config_key, e.target.checked ? 'true' : 'false')
                        }
                      />
                      <span className="font-medium text-gray-800">{row.label}</span>
                    </label>
                  )
                }

                return (
                  <div key={row.id}>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      {row.label}
                    </label>
                    <input
                      type={row.is_sensitive ? 'password' : 'text'}
                      autoComplete="off"
                      className="w-full max-w-xl rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      value={draft[row.config_key] ?? ''}
                      onChange={(e) => setField(row.config_key, e.target.value)}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
