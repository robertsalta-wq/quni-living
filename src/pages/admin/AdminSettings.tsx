import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { formatLogValue } from '../../lib/adminPricingSupabase'
import type { PlatformConfigRow } from '../../lib/platformConfig'
import { PLATFORM_CONFIG_KEYS } from '../../lib/platformConfig'
import { adminCardClass } from './adminUi'

const CHANGELOG_REDACTED = '[redacted]'

type SettingsTabId = 'business' | 'contact' | 'bank' | 'compliance' | 'docs'

const TAB_ORDER: SettingsTabId[] = ['business', 'contact', 'bank', 'compliance', 'docs']

const TAB_LABELS: Record<SettingsTabId, string> = {
  business: 'Business',
  contact: 'Contact & address',
  bank: 'Bank accounts',
  compliance: 'Compliance & legal',
  docs: 'Document defaults',
}

const STRUCTURE_OPTIONS = ['Sole trader', 'Pty Ltd', 'Partnership', 'Trust'] as const

const TRUST_KEYS = new Set(['compliance.trust_account_bsb', 'compliance.trust_account_number'])

/** Rent collection subsection: mask all fields with show/hide (per product spec). */
const RENT_COLLECTION_MASK_KEYS = new Set([
  'bank.account_name',
  'bank.bsb',
  'bank.account_number',
  'bank.bank_name',
])

const CONTACT_REGISTERED_KEYS = [
  'contact.registered_address_line1',
  'contact.registered_address_line2',
  'contact.registered_suburb',
  'contact.registered_state',
  'contact.registered_postcode',
] as const

const CONTACT_MAILING_KEYS = [
  'contact.mailing_address_line1',
  'contact.mailing_address_line2',
  'contact.mailing_suburb',
  'contact.mailing_state',
  'contact.mailing_postcode',
] as const

const CONTACT_DETAILS_KEYS = ['contact.phone', 'contact.email', 'contact.website'] as const

const MAIL_SAME_KEY = 'contact.mailing_same_as_registered'

function isGstDetailKey(configKey: string): boolean {
  return (
    configKey === PLATFORM_CONFIG_KEYS.BUSINESS_GST_RATE ||
    configKey === PLATFORM_CONFIG_KEYS.BUSINESS_GST_REGISTRATION_DATE
  )
}

function belongsToTab(row: PlatformConfigRow, tab: SettingsTabId): boolean {
  switch (tab) {
    case 'business':
      return row.category === 'business'
    case 'contact':
      return row.category === 'contact'
    case 'bank':
      return (
        row.category === 'bank' ||
        row.category === 'bank_details' ||
        TRUST_KEYS.has(row.config_key)
      )
    case 'compliance':
      return row.category === 'compliance' && !TRUST_KEYS.has(row.config_key)
    case 'docs':
      return row.category === 'document_defaults'
    default:
      return false
  }
}

function rowByKey(rows: PlatformConfigRow[], key: string): PlatformConfigRow | undefined {
  return rows.find((r) => r.config_key === key)
}

type SensitiveFieldProps = {
  row: PlatformConfigRow
  value: string
  onChange: (v: string) => void
  forceMasked?: boolean
  visible: boolean
  onToggleVisible: () => void
}

function SensitiveField({ row, value, onChange, forceMasked, visible, onToggleVisible }: SensitiveFieldProps) {
  const masked = Boolean(forceMasked || row.is_sensitive)
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-500">{row.label}</label>
        {masked ? (
          <button
            type="button"
            className="text-[12px] font-medium text-[#0F6E56] hover:underline"
            onClick={onToggleVisible}
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        ) : null}
      </div>
      <input
        type={masked && !visible ? 'password' : 'text'}
        autoComplete="off"
        className="w-full max-w-xl rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Subheading({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-900">{children}</h3>
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-gray-600">{children}</p>
}

export default function AdminSettings() {
  const { user } = useAuthContext()
  const [activeTab, setActiveTab] = useState<SettingsTabId>('business')
  const [rows, setRows] = useState<PlatformConfigRow[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [secretVisible, setSecretVisible] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [savingTab, setSavingTab] = useState<SettingsTabId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const gstRegistered =
    (draft[PLATFORM_CONFIG_KEYS.BUSINESS_GST_REGISTERED] ?? 'false').toLowerCase() === 'true'

  const mailingSameAsRegistered =
    (draft[MAIL_SAME_KEY] ?? 'true').toLowerCase() === 'true'

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

  const businessRowsSorted = useMemo(() => {
    return rows.filter((r) => r.category === 'business').sort((a, b) => a.sort_order - b.sort_order)
  }, [rows])

  const toggleSecret = useCallback((key: string) => {
    setSecretVisible((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  function setField(key: string, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  async function saveTab(tab: SettingsTabId) {
    if (!isSupabaseConfigured || !user?.email) return
    setSavingTab(tab)
    setError(null)
    setMessage(null)
    const changedBy = user.email

    try {
      const tabRows = rows.filter((r) => belongsToTab(r, tab))
      for (const row of tabRows) {
        if (tab === 'business' && isGstDetailKey(row.config_key) && !gstRegistered) continue

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

      setMessage(`Saved ${TAB_LABELS[tab]}.`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingTab(null)
    }
  }

  function renderFieldRow(row: PlatformConfigRow, opts?: { forceMasked?: boolean }) {
    return (
      <SensitiveField
        key={row.id}
        row={row}
        value={draft[row.config_key] ?? ''}
        onChange={(v) => setField(row.config_key, v)}
        forceMasked={opts?.forceMasked}
        visible={secretVisible[row.config_key] ?? false}
        onToggleVisible={() => toggleSecret(row.config_key)}
      />
    )
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="px-4 py-6 md:px-8">
        <p className="text-sm text-amber-800">Supabase is not configured.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <div className="h-10 w-10 border-2 border-[#0F6E56] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Business settings</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Legal, contact, bank, and compliance values. Sensitive fields are logged as{' '}
            <span className="font-mono text-[11px]">{CHANGELOG_REDACTED}</span> in the change log.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200 pb-0">
        {TAB_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${
              activeTab === id
                ? 'border-[#0F6E56] font-medium text-[#0F6E56]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>

      {activeTab === 'business' && (
        <div className={adminCardClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <Subheading>Business</Subheading>
            <button
              type="button"
              disabled={savingTab === 'business'}
              onClick={() => void saveTab('business')}
              className="rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d5c4a] disabled:opacity-50"
            >
              Save business
            </button>
          </div>
          <div className="space-y-4">
            {businessRowsSorted.map((row) => {
              if (isGstDetailKey(row.config_key) && !gstRegistered) return null

              if (row.config_key === 'business.structure') {
                return (
                  <div key={row.id}>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                      {row.label}
                    </label>
                    <select
                      className="w-full max-w-xl rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                      value={draft[row.config_key] ?? 'Sole trader'}
                      onChange={(e) => setField(row.config_key, e.target.value)}
                    >
                      {STRUCTURE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              }

              if (row.config_key === PLATFORM_CONFIG_KEYS.BUSINESS_GST_REGISTERED) {
                return (
                  <label key={row.id} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-[#0F6E56]"
                      checked={gstRegistered}
                      onChange={(e) => setField(row.config_key, e.target.checked ? 'true' : 'false')}
                    />
                    <span className="font-medium text-gray-800">{row.label}</span>
                  </label>
                )
              }

              return (
                <div key={row.id}>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    {row.label}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    className="w-full max-w-xl rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                    value={draft[row.config_key] ?? ''}
                    onChange={(e) => setField(row.config_key, e.target.value)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'contact' && (
        <div className={adminCardClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <Subheading>Contact & address</Subheading>
            <button
              type="button"
              disabled={savingTab === 'contact'}
              onClick={() => void saveTab('contact')}
              className="rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d5c4a] disabled:opacity-50"
            >
              Save contact & address
            </button>
          </div>
          <div className="space-y-8">
            <div className="space-y-4">
              <Subheading>Registered business address</Subheading>
              {CONTACT_REGISTERED_KEYS.map((key) => {
                const row = rowByKey(rows, key)
                return row ? renderFieldRow(row) : null
              })}
            </div>
            <div className="space-y-4 border-t border-gray-100 pt-6">
              <Subheading>Mailing address</Subheading>
              {(() => {
                const sameRow = rowByKey(rows, MAIL_SAME_KEY)
                return sameRow ? (
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-[#0F6E56]"
                      checked={mailingSameAsRegistered}
                      onChange={(e) => setField(MAIL_SAME_KEY, e.target.checked ? 'true' : 'false')}
                    />
                    <span className="font-medium text-gray-800">Same as registered address</span>
                  </label>
                ) : null
              })()}
              {!mailingSameAsRegistered
                ? CONTACT_MAILING_KEYS.map((key) => {
                    const row = rowByKey(rows, key)
                    return row ? renderFieldRow(row) : null
                  })
                : null}
            </div>
            <div className="space-y-4 border-t border-gray-100 pt-6">
              <Subheading>Contact details</Subheading>
              {CONTACT_DETAILS_KEYS.map((key) => {
                const row = rowByKey(rows, key)
                return row ? renderFieldRow(row) : null
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bank' && (
        <div className={adminCardClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <Subheading>Bank accounts</Subheading>
            <button
              type="button"
              disabled={savingTab === 'bank'}
              onClick={() => void saveTab('bank')}
              className="rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d5c4a] disabled:opacity-50"
            >
              Save bank accounts
            </button>
          </div>
          <div className="space-y-8">
            <div className="space-y-3">
              <Subheading>Rent collection account</Subheading>
              <Note>
                Students pay weekly rent into this account. Details appear on tenancy agreements.
              </Note>
              <div className="space-y-4 pt-1">
                {['bank.account_name', 'bank.bsb', 'bank.account_number', 'bank.bank_name'].map((key) => {
                  const row = rowByKey(rows, key)
                  return row ? renderFieldRow(row, { forceMasked: RENT_COLLECTION_MASK_KEYS.has(key) }) : null
                })}
              </div>
            </div>
            <div className="space-y-3 border-t border-gray-100 pt-6">
              <Subheading>Trading / operating account</Subheading>
              <Note>Quni operational account for expenses and founder draw.</Note>
              <div className="space-y-4 pt-1">
                {['bank.trading_account_name', 'bank.trading_bsb', 'bank.trading_account_number', 'bank.trading_bank_name'].map(
                  (key) => {
                    const row = rowByKey(rows, key)
                    return row ? renderFieldRow(row) : null
                  },
                )}
              </div>
            </div>
            <div className="space-y-3 border-t border-gray-100 pt-6">
              <Subheading>Trust account</Subheading>
              <Note>
                Complete after legal review — required before accepting rent payments under RTA tenancies.
              </Note>
              <div className="space-y-4 pt-1">
                {['compliance.trust_account_bsb', 'compliance.trust_account_number'].map((key) => {
                  const row = rowByKey(rows, key)
                  return row ? renderFieldRow(row) : null
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className={adminCardClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <Subheading>Compliance & legal</Subheading>
            <button
              type="button"
              disabled={savingTab === 'compliance'}
              onClick={() => void saveTab('compliance')}
              className="rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d5c4a] disabled:opacity-50"
            >
              Save compliance & legal
            </button>
          </div>
          <div className="space-y-4">
            {rows
              .filter((r) => belongsToTab(r, 'compliance'))
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((row) => renderFieldRow(row))}
          </div>
        </div>
      )}

      {activeTab === 'docs' && (
        <div className={adminCardClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <Subheading>Document defaults</Subheading>
            <button
              type="button"
              disabled={savingTab === 'docs'}
              onClick={() => void saveTab('docs')}
              className="rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d5c4a] disabled:opacity-50"
            >
              Save document defaults
            </button>
          </div>
          <div className="space-y-4">
            {['docs.docuseal_url', 'docs.sender_name', 'docs.sender_email', 'docs.condition_report_note'].map((key) => {
              const row = rowByKey(rows, key)
              return row ? renderFieldRow(row) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}
