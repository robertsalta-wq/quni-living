import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { formatLogValue } from '../../lib/adminPricingSupabase'
import type { PlatformConfigRow } from '../../lib/platformConfig'
import { PLATFORM_CONFIG_KEYS } from '../../lib/platformConfig'
import { Check, ExternalLink, Pencil, Trash2, X } from 'lucide-react'
import { adminCardClass, adminTableWrapClass, adminTdClass, adminThClass } from './adminUi'

const CHANGELOG_REDACTED = '[redacted]'

const SOCIAL_STORAGE_KEY = 'quni_social_accounts'

type SettingsTabId = 'business' | 'contact' | 'bank' | 'compliance' | 'docs' | 'social'

const TAB_ORDER: SettingsTabId[] = ['business', 'contact', 'bank', 'compliance', 'docs', 'social']

const TAB_LABELS: Record<SettingsTabId, string> = {
  business: 'Business',
  contact: 'Contact & address',
  bank: 'Bank accounts',
  compliance: 'Compliance & legal',
  docs: 'Document defaults',
  social: 'Social media',
}

type SocialAccount = {
  platform: string
  type: 'Brand' | 'Personal' | 'Company'
  handle: string
  url: string
  status: 'Active' | 'Parked' | 'Not created'
}

const SOCIAL_ACCOUNTS_INITIAL: SocialAccount[] = [
  { platform: 'TikTok', type: 'Brand', handle: '@quniliving', url: 'https://tiktok.com/@quniliving', status: 'Active' },
  { platform: 'TikTok', type: 'Personal', handle: '@quinnleeau', url: 'https://tiktok.com/@quinnleeau', status: 'Not created' },
  { platform: 'Instagram', type: 'Brand', handle: '@quniliving', url: 'https://instagram.com/quniliving', status: 'Not created' },
  { platform: 'Instagram', type: 'Personal', handle: '@quinnleeau', url: 'https://instagram.com/quinnleeau', status: 'Not created' },
  { platform: 'LinkedIn', type: 'Company', handle: 'Quni Living', url: 'https://linkedin.com/company/quniliving', status: 'Not created' },
  { platform: 'LinkedIn', type: 'Personal', handle: 'Quinn Lee', url: 'https://linkedin.com/in/quinnleeau', status: 'Not created' },
  { platform: 'Facebook', type: 'Brand', handle: 'Quni Living', url: 'https://facebook.com/quniliving', status: 'Not created' },
  { platform: 'YouTube', type: 'Brand', handle: '@quniliving', url: 'https://youtube.com/@quniliving', status: 'Not created' },
  { platform: 'Twitter/X', type: 'Brand', handle: '@quniliving', url: 'https://x.com/quniliving', status: 'Not created' },
]

function cloneSocialInitial(): SocialAccount[] {
  return SOCIAL_ACCOUNTS_INITIAL.map((r) => ({ ...r }))
}

function isSocialStatus(v: unknown): v is SocialAccount['status'] {
  return v === 'Active' || v === 'Parked' || v === 'Not created'
}

function isSocialType(v: unknown): v is SocialAccount['type'] {
  return v === 'Brand' || v === 'Personal' || v === 'Company'
}

function parseStoredSocialAccounts(raw: string | null): SocialAccount[] | null {
  if (raw == null || raw.trim() === '') return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const out: SocialAccount[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      if (typeof o.platform !== 'string') return null
      if (!isSocialType(o.type)) return null
      if (typeof o.handle !== 'string') return null
      if (typeof o.url !== 'string') return null
      if (!isSocialStatus(o.status)) return null
      out.push({
        platform: o.platform,
        type: o.type,
        handle: o.handle,
        url: o.url,
        status: o.status,
      })
    }
    return out
  } catch {
    return null
  }
}

function loadSocialAccountsFromStorage(): SocialAccount[] {
  if (typeof window === 'undefined') return cloneSocialInitial()
  const parsed = parseStoredSocialAccounts(localStorage.getItem(SOCIAL_STORAGE_KEY))
  return parsed ?? cloneSocialInitial()
}

const SOCIAL_PLATFORM_OPTIONS = [
  'TikTok',
  'Instagram',
  'LinkedIn',
  'Facebook',
  'YouTube',
  'Twitter/X',
  'Other',
] as const

function socialPlatformSelectValue(platform: string): (typeof SOCIAL_PLATFORM_OPTIONS)[number] {
  for (const o of SOCIAL_PLATFORM_OPTIONS) {
    if (o !== 'Other' && o === platform) return o
  }
  return 'Other'
}

function socialStatusSelectClass(status: SocialAccount['status']): string {
  const base =
    'min-w-[9.5rem] rounded-lg border px-2 py-1.5 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1'
  if (status === 'Active') {
    return `${base} border-transparent bg-[#E8724A] text-white focus:ring-[#E8724A]`
  }
  if (status === 'Parked') {
    return `${base} border-gray-200/80 bg-gray-400/35 text-gray-800 focus:ring-gray-400`
  }
  return `${base} border-gray-200 bg-gray-100 text-gray-600 focus:ring-gray-300`
}

function SocialPlatformIcon({ platform, rowIndex }: { platform: string; rowIndex: number }) {
  const cls = 'h-4 w-4 shrink-0'
  const p = platform.toLowerCase()
  const igGradId = `ig-gradient-${rowIndex}`

  if (p.includes('tiktok')) {
    return (
      <svg className={cls} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#69C9D0"
          d="M14.42 2h3.17v8.15a4.84 4.84 0 0 1-3.77-4.25V2z"
          transform="translate(-0.35 0.35)"
        />
        <path
          fill="#EE1D52"
          d="M14.42 2h3.17v8.15a4.84 4.84 0 0 1-3.77-4.25V2z"
          transform="translate(0.4 -0.25)"
        />
        <path
          fill="#010101"
          d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05 6.33 6.33 0 1 0 0 12.66 6.33 6.33 0 0 0 6.33-6.33V8.73a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
        />
      </svg>
    )
  }
  if (p.includes('instagram')) {
    return (
      <svg className={cls} viewBox="0 0 24 24" aria-hidden>
        <defs>
          <linearGradient id={igGradId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F58529" />
            <stop offset="45%" stopColor="#DD2A7B" />
            <stop offset="100%" stopColor="#8134AF" />
          </linearGradient>
        </defs>
        <path
          fill={`url(#${igGradId})`}
          d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
        />
      </svg>
    )
  }
  if (p.includes('linkedin')) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          fill="#0A66C2"
          d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
        />
      </svg>
    )
  }
  if (p.includes('facebook')) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          fill="#1877F2"
          d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        />
      </svg>
    )
  }
  if (p.includes('youtube')) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          fill="#FF0000"
          d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
        />
        <path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    )
  }
  if (p.includes('twitter')) {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="#000000" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    )
  }
  return null
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
    case 'social':
      return false
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
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>(() => loadSocialAccountsFromStorage())
  const [urlEditIndex, setUrlEditIndex] = useState<number | null>(null)
  const [urlEditDraft, setUrlEditDraft] = useState('')
  const [fullEditRowIndex, setFullEditRowIndex] = useState<number | null>(null)
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(SOCIAL_STORAGE_KEY, JSON.stringify(socialAccounts))
    } catch {
      /* ignore quota / private mode */
    }
  }, [socialAccounts])

  const businessRowsSorted = useMemo(() => {
    return rows.filter((r) => r.category === 'business').sort((a, b) => a.sort_order - b.sort_order)
  }, [rows])

  const toggleSecret = useCallback((key: string) => {
    setSecretVisible((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const updateSocialRow = useCallback((index: number, patch: Partial<SocialAccount>) => {
    setSocialAccounts((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }, [])

  const beginUrlEdit = useCallback(
    (index: number) => {
      const u = socialAccounts[index]?.url ?? ''
      setUrlEditDraft(u)
      setUrlEditIndex(index)
    },
    [socialAccounts],
  )

  const confirmUrlEdit = useCallback(() => {
    if (urlEditIndex === null) return
    const i = urlEditIndex
    const nextUrl = urlEditDraft
    setSocialAccounts((prev) => prev.map((r, j) => (j === i ? { ...r, url: nextUrl } : r)))
    setUrlEditIndex(null)
  }, [urlEditDraft, urlEditIndex])

  const cancelUrlEdit = useCallback(() => {
    setUrlEditIndex(null)
  }, [])

  const handleAddSocialAccount = useCallback(() => {
    const newIndex = socialAccounts.length
    setSocialAccounts((prev) => [
      ...prev,
      { platform: '', type: 'Brand', handle: '', url: '', status: 'Not created' },
    ])
    setFullEditRowIndex(newIndex)
    setUrlEditIndex(null)
  }, [socialAccounts.length])

  const confirmFullRowEdit = useCallback(() => {
    setFullEditRowIndex(null)
  }, [])

  const deleteSocialRow = useCallback((index: number) => {
    if (!window.confirm('Remove this account?')) return
    setSocialAccounts((prev) => prev.filter((_, i) => i !== index))
    setUrlEditIndex((cur) => {
      if (cur === null) return null
      if (cur === index) return null
      if (cur > index) return cur - 1
      return cur
    })
    setFullEditRowIndex((cur) => {
      if (cur === null) return null
      if (cur === index) return null
      if (cur > index) return cur - 1
      return cur
    })
  }, [])

  function setField(key: string, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  async function saveTab(tab: SettingsTabId) {
    if (tab === 'social') return
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

      {activeTab === 'social' && (
        <div className={adminCardClass}>
          <div className="mb-4 border-b border-gray-100 pb-4">
            <Subheading>Social media</Subheading>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
              Editable list — stored in this browser only (<span className="font-mono text-[11px]">{SOCIAL_STORAGE_KEY}</span>
              ). Not saved to Supabase.
            </p>
          </div>
          <div className={adminTableWrapClass}>
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className={adminThClass}>Platform</th>
                  <th className={adminThClass}>Type</th>
                  <th className={adminThClass}>Handle</th>
                  <th className={adminThClass}>URL</th>
                  <th className={adminThClass}>Status</th>
                  <th className={`${adminThClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {socialAccounts.map((row, idx) => {
                  const isUrlEditing = urlEditIndex === idx
                  const isFullRowEditing = fullEditRowIndex === idx
                  const blockUrlPencil = fullEditRowIndex !== null && !isFullRowEditing
                  const selPlatform = isFullRowEditing ? socialPlatformSelectValue(row.platform) : null
                  return (
                    <tr key={`social-row-${idx}`} className="border-b border-gray-100 last:border-0">
                      <td className={adminTdClass}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <div className="flex shrink-0 items-center gap-2">
                            <SocialPlatformIcon platform={row.platform} rowIndex={idx} />
                          </div>
                          {isFullRowEditing ? (
                            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                              <select
                                className="max-w-[10rem] rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                                value={selPlatform ?? 'Other'}
                                onChange={(e) => {
                                  const v = e.target.value as (typeof SOCIAL_PLATFORM_OPTIONS)[number]
                                  if (v === 'Other') updateSocialRow(idx, { platform: '' })
                                  else updateSocialRow(idx, { platform: v })
                                }}
                              >
                                {SOCIAL_PLATFORM_OPTIONS.map((o) => (
                                  <option key={o} value={o}>
                                    {o}
                                  </option>
                                ))}
                              </select>
                              {selPlatform === 'Other' ? (
                                <input
                                  type="text"
                                  autoComplete="off"
                                  placeholder="Platform name"
                                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                                  value={row.platform}
                                  onChange={(e) => updateSocialRow(idx, { platform: e.target.value })}
                                />
                              ) : null}
                            </div>
                          ) : (
                            <span className="min-w-0 font-medium text-gray-900">{row.platform || '—'}</span>
                          )}
                        </div>
                      </td>
                      <td className={adminTdClass}>
                        {isFullRowEditing ? (
                          <select
                            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-800 shadow-sm focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                            value={row.type}
                            onChange={(e) =>
                              updateSocialRow(idx, { type: e.target.value as SocialAccount['type'] })
                            }
                            disabled={isUrlEditing}
                          >
                            <option value="Brand">Brand</option>
                            <option value="Personal">Personal</option>
                            <option value="Company">Company</option>
                          </select>
                        ) : (
                          <span className="text-sm text-gray-800">{row.type}</span>
                        )}
                      </td>
                      <td className={adminTdClass}>
                        {isFullRowEditing ? (
                          <input
                            type="text"
                            autoComplete="off"
                            className="w-full min-w-[6rem] max-w-[14rem] rounded-lg border border-gray-200 px-2 py-1.5 font-mono text-[13px] text-gray-800 shadow-sm focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                            value={row.handle}
                            onChange={(e) => updateSocialRow(idx, { handle: e.target.value })}
                            disabled={isUrlEditing}
                          />
                        ) : (
                          <span className="font-mono text-[13px] text-gray-800">{row.handle || '—'}</span>
                        )}
                      </td>
                      <td className={`${adminTdClass} max-w-[min(28rem,55vw)]`}>
                        {isUrlEditing ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <input
                              type="url"
                              autoComplete="off"
                              className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                              value={urlEditDraft}
                              onChange={(e) => setUrlEditDraft(e.target.value)}
                            />
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-[#0F6E56] hover:bg-emerald-50"
                              title="Save URL"
                              aria-label="Save URL"
                              onClick={() => void confirmUrlEdit()}
                            >
                              <Check className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                              title="Cancel URL edit"
                              aria-label="Cancel URL edit"
                              onClick={() => void cancelUrlEdit()}
                            >
                              <X className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        ) : isFullRowEditing ? (
                          <input
                            type="url"
                            autoComplete="off"
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                            value={row.url}
                            onChange={(e) => updateSocialRow(idx, { url: e.target.value })}
                          />
                        ) : (
                          <div className="flex min-w-0 items-center gap-1">
                            <span className="min-w-0 flex-1 truncate text-sm text-gray-800" title={row.url}>
                              {row.url || '—'}
                            </span>
                            <button
                              type="button"
                              disabled={blockUrlPencil}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40"
                              title="Edit URL"
                              aria-label="Edit URL"
                              onClick={() => beginUrlEdit(idx)}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className={adminTdClass}>
                        <select
                          className={socialStatusSelectClass(row.status)}
                          value={row.status}
                          onChange={(e) =>
                            updateSocialRow(idx, { status: e.target.value as SocialAccount['status'] })
                          }
                          disabled={isUrlEditing}
                        >
                          <option value="Active">Active</option>
                          <option value="Parked">Parked</option>
                          <option value="Not created">Not created</option>
                        </select>
                      </td>
                      <td className={`${adminTdClass} text-right`}>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {isFullRowEditing ? (
                            <>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-[#0F6E56] hover:bg-emerald-50"
                                title="Save new account"
                                aria-label="Save new account"
                                onClick={() => void confirmFullRowEdit()}
                              >
                                <Check className="h-4 w-4" aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                                title="Discard new account"
                                aria-label="Discard new account"
                                onClick={() => {
                                  const i = fullEditRowIndex
                                  setFullEditRowIndex(null)
                                  if (i === null) return
                                  setSocialAccounts((prev) => {
                                    const r = prev[i]
                                    if (!r) return prev
                                    const blank =
                                      !r.platform.trim() && !r.handle.trim() && !r.url.trim()
                                    if (blank) return prev.filter((_, j) => j !== i)
                                    return prev
                                  })
                                }}
                              >
                                <X className="h-4 w-4" aria-hidden />
                              </button>
                            </>
                          ) : (
                            <>
                              {(row.status === 'Active' || row.status === 'Parked') && row.url.trim() ? (
                                <a
                                  href={row.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-[#0F6E56]"
                                  title={`Open ${row.platform || 'profile'}`}
                                  aria-label="Open in new tab"
                                >
                                  <ExternalLink className="h-4 w-4" aria-hidden />
                                </a>
                              ) : null}
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-700 hover:bg-red-50"
                                title="Remove account"
                                aria-label="Remove account"
                                onClick={() => void deleteSocialRow(idx)}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => void handleAddSocialAccount()}
              disabled={fullEditRowIndex !== null || urlEditIndex !== null}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add account
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
