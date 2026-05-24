import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  resolveTenancyPackage,
  type TenancyPackageInput,
  type TenancyPackageResult,
} from '../../lib/tenancy/resolveTenancyPackage'
import {
  resolveServiceTierAvailability,
  type PropertyTier,
  type ResolveServiceTierOptions,
  type ServiceTierAvailabilityStatus,
} from '../../lib/serviceTier'
import {
  buildManagedOverridesMap,
  managedMatrixKey,
  type MatrixStateCode,
} from '../../lib/serviceTier/matrix'
import { useAuthContext } from '../../context/AuthContext'
import { usePlatformFeatures } from '../../context/PlatformFeaturesContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { adminCardClass } from './adminUi'

const CORAL = '#FF6F61'

type MatrixRow = Database['public']['Tables']['service_tier_state_matrix']['Row']

const MATRIX_STATE_ROWS: { code: MatrixStateCode; label: string }[] = [
  { code: 'NSW', label: 'NSW' },
  { code: 'QLD', label: 'QLD' },
  { code: 'VIC', label: 'VIC' },
  { code: 'DEFAULT', label: 'Other Australian states' },
]

const MATRIX_TIERS: { id: PropertyTier; label: string }[] = [
  { id: 't1', label: 'Tier 1 — Hosted room' },
  { id: 't2', label: 'Tier 2 — Private room' },
  { id: 't3', label: 'Tier 3 — Boarding house' },
]

const MANAGED_STATUS_OPTIONS: { value: ServiceTierAvailabilityStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'gated', label: 'Gated' },
  { value: 'unsupported', label: 'Unsupported' },
]

type CanonicalScenario = {
  id: string
  columnLabel: string
  rowLabel: string
  section: 'supported' | 'other_states'
  /** Intent label for docs — tier is always derived by the resolver */
  intent: string
  input: TenancyPackageInput
}

/**
 * Canonical probes — `date` omitted (v1 resolver ignores it; matches simplified calls).
 * Tier is never passed in; scenario ids encode intent only.
 */
const CANONICAL_SCENARIOS: CanonicalScenario[] = [
  {
    id: 'nsw-t1',
    columnLabel: 'Tier 1',
    rowLabel: 'NSW',
    section: 'supported',
    intent: 'Hosted room / boarder-lodger style (on-site landlord)',
    input: {
      state: 'NSW',
      property_type: 'private_room_landlord_on_site',
      is_registered_rooming_house: false,
    },
  },
  {
    id: 'nsw-t2',
    columnLabel: 'Tier 2',
    rowLabel: 'NSW',
    section: 'supported',
    intent: 'Residential tenancy–style (off-site / entire / shared)',
    input: {
      state: 'NSW',
      property_type: 'private_room_landlord_off_site',
      is_registered_rooming_house: false,
    },
  },
  {
    id: 'nsw-t3',
    columnLabel: 'Tier 3',
    rowLabel: 'NSW',
    section: 'supported',
    intent: 'Registered rooming house (off-site private room + rooming flag)',
    input: {
      state: 'NSW',
      property_type: 'private_room_landlord_off_site',
      is_registered_rooming_house: true,
    },
  },
  {
    id: 'vic-t1',
    columnLabel: 'Tier 1',
    rowLabel: 'VIC',
    section: 'supported',
    intent: 'Hosted room (on-site landlord)',
    input: {
      state: 'VIC',
      property_type: 'private_room_landlord_on_site',
      is_registered_rooming_house: false,
    },
  },
  {
    id: 'vic-t2',
    columnLabel: 'Tier 2',
    rowLabel: 'VIC',
    section: 'supported',
    intent: 'Residential rental agreement path',
    input: {
      state: 'VIC',
      property_type: 'private_room_landlord_off_site',
      is_registered_rooming_house: false,
    },
  },
  {
    id: 'vic-t3',
    columnLabel: 'Tier 3',
    rowLabel: 'VIC',
    section: 'supported',
    intent: 'Rooming house deferred — expect supported: false',
    input: {
      state: 'VIC',
      property_type: 'private_room_landlord_off_site',
      is_registered_rooming_house: true,
    },
  },
  {
    id: 'qld-t1',
    columnLabel: 'Tier 1',
    rowLabel: 'QLD',
    section: 'supported',
    intent: 'Hosted room / boarder-lodger style (on-site landlord)',
    input: {
      state: 'QLD',
      property_type: 'private_room_landlord_on_site',
      is_registered_rooming_house: false,
    },
  },
  {
    id: 'qld-t2',
    columnLabel: 'Tier 2',
    rowLabel: 'QLD',
    section: 'supported',
    intent: 'Residential tenancy–style (off-site / entire / shared)',
    input: {
      state: 'QLD',
      property_type: 'private_room_landlord_off_site',
      is_registered_rooming_house: false,
    },
  },
  {
    id: 'qld-t3',
    columnLabel: 'Tier 3',
    rowLabel: 'QLD',
    section: 'supported',
    intent: 'Registered rooming house — deferred',
    input: {
      state: 'QLD',
      property_type: 'private_room_landlord_off_site',
      is_registered_rooming_house: true,
    },
  },
  {
    id: 'other-au-t1',
    columnLabel: 'Tier 1',
    rowLabel: 'Other Australian states',
    section: 'other_states',
    intent: 'Non-launch states — Listing nationwide; Managed not cleared (WA representative)',
    input: {
      state: 'WA',
      property_type: 'private_room_landlord_on_site',
      is_registered_rooming_house: false,
    },
  },
  {
    id: 'other-au-t2',
    columnLabel: 'Tier 2',
    rowLabel: 'Other Australian states',
    section: 'other_states',
    intent: 'Non-launch states — Listing nationwide; Managed not cleared (WA representative)',
    input: {
      state: 'WA',
      property_type: 'private_room_landlord_off_site',
      is_registered_rooming_house: false,
    },
  },
  {
    id: 'other-au-t3',
    columnLabel: 'Tier 3',
    rowLabel: 'Other Australian states',
    section: 'other_states',
    intent: 'Non-launch states — Listing nationwide; Managed not cleared (WA representative)',
    input: {
      state: 'WA',
      property_type: 'private_room_landlord_off_site',
      is_registered_rooming_house: true,
    },
  },
]

type ResolvedCell = {
  scenario: CanonicalScenario
  result: TenancyPackageResult | null
  serviceTier: ReturnType<typeof resolveServiceTierAvailability>
  error: string | null
}

function resolveAll(resolverOptions?: ResolveServiceTierOptions): ResolvedCell[] {
  const propertyTierFromScenario = (id: string): PropertyTier => {
    if (id.endsWith('-t1')) return 't1'
    if (id.endsWith('-t2')) return 't2'
    return 't3'
  }
  return CANONICAL_SCENARIOS.map((scenario) => {
    const serviceTier = resolveServiceTierAvailability(
      scenario.input.state,
      propertyTierFromScenario(scenario.id),
      resolverOptions,
    )
    try {
      return { scenario, result: resolveTenancyPackage(scenario.input), serviceTier, error: null }
    } catch (e) {
      return {
        scenario,
        result: null,
        serviceTier,
        error: e instanceof Error ? e.message : String(e),
      }
    }
  })
}

function cellGlance(result: TenancyPackageResult | null): string {
  if (!result) return '—'
  if (!result.supported) {
    return `Unsupported · ${result.unsupportedReason}`
  }
  const b = result.rules.bond
  const holder = b.schemeApplies ? 'Scheme' : 'Landlord-held'
  let auth = ''
  if (b.schemeApplies) {
    const line = b.authorityPublicLabel || b.authority
    if (line) auth = ` · ${line}`
  }
  let days = ''
  if (b.schemeApplies) {
    days = ` · ${b.lodgementDays}d lodgement${
      b.lodgementDaysUnit === 'calendar' ? ' (cal.)' : ' (bus.)'
    }`
  }
  return `${holder}${auth}${days}`
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <pre className="text-xs bg-gray-50 border border-gray-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

export default function AdminStateWorkflows() {
  const { user } = useAuthContext()
  const { managedTierEnabled } = usePlatformFeatures()
  const [matrixRows, setMatrixRows] = useState<MatrixRow[]>([])
  const [matrixLoading, setMatrixLoading] = useState(true)
  const [matrixError, setMatrixError] = useState<string | null>(null)
  const [matrixSaving, setMatrixSaving] = useState<string | null>(null)

  const loadMatrix = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setMatrixLoading(true)
    setMatrixError(null)
    const { data, error } = await supabase
      .from('service_tier_state_matrix')
      .select('*')
      .order('state_code')
      .order('property_tier')
    if (error) {
      setMatrixError(error.message)
      setMatrixRows([])
    } else {
      setMatrixRows((data ?? []) as MatrixRow[])
    }
    setMatrixLoading(false)
  }, [])

  useEffect(() => {
    void loadMatrix()
  }, [loadMatrix])

  const previewOverrides = useMemo(() => buildManagedOverridesMap(matrixRows), [matrixRows])

  const resolverOptions = useMemo(
    (): ResolveServiceTierOptions => ({
      managedGloballyEnabled: managedTierEnabled,
      managedOverrides: previewOverrides,
    }),
    [managedTierEnabled, previewOverrides],
  )

  const cells = useMemo(() => resolveAll(resolverOptions), [resolverOptions])
  const [selectedId, setSelectedId] = useState<string>('nsw-t1')

  const matrixByKey = useMemo(() => {
    const map = new Map<string, MatrixRow>()
    for (const row of matrixRows) {
      map.set(managedMatrixKey(row.state_code as MatrixStateCode, row.property_tier as PropertyTier), row)
    }
    return map
  }, [matrixRows])

  async function handleManagedStatusChange(
    stateCode: MatrixStateCode,
    tier: PropertyTier,
    managedStatus: ServiceTierAvailabilityStatus,
  ) {
    const key = managedMatrixKey(stateCode, tier)
    const existing = matrixByKey.get(key)
    setMatrixSaving(key)
    setMatrixError(null)
    const { data, error } = await supabase
      .from('service_tier_state_matrix')
      .upsert(
        {
          id: existing?.id,
          state_code: stateCode,
          property_tier: tier,
          managed_status: managedStatus,
          notes: existing?.notes ?? null,
          updated_by: user?.id ?? null,
        },
        { onConflict: 'state_code,property_tier' },
      )
      .select('*')
      .single()
    if (error) {
      setMatrixError(error.message)
    } else if (data) {
      const row = data as MatrixRow
      setMatrixRows((prev) => {
        const next = prev.filter(
          (r) => !(r.state_code === row.state_code && r.property_tier === row.property_tier),
        )
        return [...next, row].sort((a, b) =>
          a.state_code === b.state_code
            ? a.property_tier.localeCompare(b.property_tier)
            : a.state_code.localeCompare(b.state_code),
        )
      })
    }
    setMatrixSaving(null)
  }

  const selected = cells.find((c) => c.scenario.id === selectedId) ?? cells[0]

  const supportedCells = cells.filter((c) => c.scenario.section === 'supported')
  const otherStatesCells = cells.filter((c) => c.scenario.section === 'other_states')

  const nswRow = supportedCells.filter((c) => c.scenario.rowLabel === 'NSW')
  const vicRow = supportedCells.filter((c) => c.scenario.rowLabel === 'VIC')
  const qldRow = supportedCells.filter((c) => c.scenario.rowLabel === 'QLD')
  const otherAuRow = otherStatesCells.filter((c) => c.scenario.rowLabel === 'Other Australian states')

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">State workflows</h1>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-3xl">
          Configure <strong>Managed</strong> availability per state and property tier. Listing rules stay in code; tenancy
          package probes below are read-only. Changes apply without deploy once the global Managed flag is on in Business
          settings.
        </p>
      </header>

      {matrixError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {matrixError}
        </div>
      )}

      <section className={`${adminCardClass} mb-10 space-y-4`}>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Managed tier matrix</h2>
          <p className="mt-1 text-sm text-gray-600">
            {managedTierEnabled
              ? 'Global Managed is ON — matrix below controls where Managed is bookable.'
              : 'Global Managed is OFF — Managed stays gated everywhere until you enable it in Admin → Settings → Compliance.'}
          </p>
        </div>
        {matrixLoading ? (
          <p className="text-sm text-gray-500">Loading matrix…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    State
                  </th>
                  {MATRIX_TIERS.map((tier) => (
                    <th
                      key={tier.id}
                      className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      {tier.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX_STATE_ROWS.map(({ code, label }) => (
                  <tr key={code} className="border-b border-gray-50">
                    <td className="py-3 px-3 font-medium text-gray-900">{label}</td>
                    {MATRIX_TIERS.map((tier) => {
                      const key = managedMatrixKey(code, tier.id)
                      const row = matrixByKey.get(key)
                      const status = row?.managed_status ?? 'unsupported'
                      return (
                        <td key={key} className="py-2 px-2">
                          <select
                            value={status}
                            disabled={matrixSaving === key}
                            onChange={(e) =>
                              void handleManagedStatusChange(
                                code,
                                tier.id,
                                e.target.value as ServiceTierAvailabilityStatus,
                              )
                            }
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm disabled:opacity-50"
                          >
                            {MANAGED_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {row?.notes ? (
                            <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">{row.notes}</p>
                          ) : null}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-500">
          Effective status: {managedTierEnabled ? 'matrix value' : 'gated (global off)'}. Preview updates in the tables
          below.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-lg font-semibold text-gray-900">Tenancy package probes (read-only)</h2>
        <div className={`${adminCardClass} overflow-x-auto`}>
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-24">
                  State
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tier 1 — Hosted Room
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tier 2 — Private Room
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tier 3 — Boarding House
                </th>
              </tr>
            </thead>
            <tbody>
              {[nswRow, vicRow, qldRow].map((rowCells) => {
                const stateLabel = rowCells[0]?.scenario.rowLabel ?? ''
                return (
                  <tr key={stateLabel} className="border-b border-gray-50 align-top">
                    <td className="py-3 px-3 font-medium text-gray-900">{stateLabel}</td>
                    {rowCells.map((cell) => (
                      <td key={cell.scenario.id} className="py-2 px-2">
                        <button
                          type="button"
                          onClick={() => setSelectedId(cell.scenario.id)}
                          className={`w-full text-left rounded-xl border-2 p-3 transition-colors ${
                            selectedId === cell.scenario.id
                              ? 'border-[#FF6F61] bg-[#FF6F61]/5'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <p className="text-xs font-mono text-gray-500 mb-1">{cell.scenario.id}</p>
                          {cell.error ? (
                            <p className="text-red-700 text-xs">{cell.error}</p>
                          ) : (
                            <>
                              <p className="font-medium text-gray-900">
                                {cell.result?.supported ? (
                                  <span style={{ color: CORAL }}>Supported</span>
                                ) : (
                                  <span className="text-amber-800">Not supported</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-3">
                                {cell.result
                                  ? cell.result.supported
                                    ? `generator: ${cell.result.generator} · ${cellGlance(cell.result)}`
                                    : cell.result.unsupportedReason
                                  : '—'}
                              </p>
                              <p className="mt-1 text-[11px] text-gray-600">
                                Listing: {cell.serviceTier.listing === 'available' ? '✓' : '✕'} | Managed:{' '}
                                {cell.serviceTier.managed === 'available'
                                  ? '✓'
                                  : cell.serviceTier.managed === 'gated'
                                    ? '⚠ Gated'
                                    : '✕'}
                              </p>
                            </>
                          )}
                        </button>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-lg font-semibold text-gray-900">Other Australian states</h2>
        <p className="text-sm text-gray-600">
          Non-launch states (WA shown as representative). Tenancy package resolver may still return{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">unsupported_state</code> — service tier availability is
          separate: <strong>Listing: available</strong>, <strong>Managed: unsupported</strong>.
        </p>
        <div className={`${adminCardClass} overflow-x-auto`}>
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-24">
                  State
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tier 1 — Hosted Room
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tier 2 — Private Room
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tier 3 — Boarding House
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50 align-top">
                <td className="py-3 px-3 font-medium text-gray-900">Other Australian states</td>
                {otherAuRow.map((cell) => (
                  <td key={cell.scenario.id} className="py-2 px-2">
                    <button
                      type="button"
                      onClick={() => setSelectedId(cell.scenario.id)}
                      className={`w-full text-left rounded-xl border-2 p-3 transition-colors ${
                        selectedId === cell.scenario.id
                          ? 'border-[#FF6F61] bg-[#FF6F61]/5'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <p className="text-xs font-mono text-gray-500 mb-1">{cell.scenario.id}</p>
                      {cell.error ? (
                        <p className="text-red-700 text-xs">{cell.error}</p>
                      ) : (
                        <>
                          <p className="font-medium text-gray-900">
                            {cell.result?.supported ? (
                              <span style={{ color: CORAL }}>Supported</span>
                            ) : (
                              <span className="text-amber-800">Not supported</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-3">
                            {cell.result
                              ? cell.result.supported
                                ? `generator: ${cell.result.generator} · ${cellGlance(cell.result)}`
                                : cell.result.unsupportedReason
                              : '—'}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-600">
                            Listing: {cell.serviceTier.listing === 'available' ? '✓' : '✕'} | Managed:{' '}
                            {cell.serviceTier.managed === 'available'
                              ? '✓'
                              : cell.serviceTier.managed === 'gated'
                                ? '⚠ Gated'
                                : '✕'}
                          </p>
                        </>
                      )}
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${adminCardClass} space-y-4`}>
        <h2 className="text-lg font-semibold text-gray-900">Detail</h2>
        {selected && (
          <>
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{selected.scenario.id}</span>
                {' · '}
                {selected.scenario.intent}
              </p>
            </div>
            <JsonBlock label="Canonical TenancyPackageInput" value={selected.scenario.input} />
            {selected.error ? (
              <p className="text-red-700 text-sm">Resolver threw: {selected.error}</p>
            ) : selected.result ? (
              <>
                <JsonBlock label="Service tier availability" value={selected.serviceTier} />
                <JsonBlock label="TenancyPackageResult (full)" value={selected.result} />
                {selected.result.supported && selected.result.rules ? (
                  <JsonBlock label="rules.bond (bond fields only)" value={selected.result.rules.bond} />
                ) : null}
                <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                  Reserved for future rule keys (added when consumers exist): tribunal, terminology, notices,
                  minStandards.
                </p>
              </>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}
