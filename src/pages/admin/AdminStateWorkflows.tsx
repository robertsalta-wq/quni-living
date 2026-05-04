import { useMemo, useState } from 'react'
import {
  resolveTenancyPackage,
  type TenancyPackageInput,
  type TenancyPackageResult,
} from '../../lib/tenancy/resolveTenancyPackage'
import { adminCardClass } from './adminUi'

const CORAL = '#FF6F61'

type CanonicalScenario = {
  id: string
  columnLabel: string
  rowLabel: string
  section: 'supported' | 'unsupported'
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
  ...(['SA', 'WA', 'ACT', 'NT', 'TAS'] as const).map((st) => ({
    id: `${st.toLowerCase()}-probe`,
    columnLabel: st,
    rowLabel: 'Unsupported',
    section: 'unsupported' as const,
    intent: 'Resolver short-circuits on state',
    input: {
      state: st,
      property_type: 'entire_property',
      is_registered_rooming_house: false,
    },
  })),
]

type ResolvedCell = {
  scenario: CanonicalScenario
  result: TenancyPackageResult | null
  error: string | null
}

function resolveAll(): ResolvedCell[] {
  return CANONICAL_SCENARIOS.map((scenario) => {
    try {
      return { scenario, result: resolveTenancyPackage(scenario.input), error: null }
    } catch (e) {
      return {
        scenario,
        result: null,
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
  const auth =
    b.schemeApplies && (b.authorityPublicLabel || b.authority)
      ? ` · ${b.authorityPublicLabel ?? b.authority}`
      : ''
  const days = b.schemeApplies && b.lodgementDays != null ? ` · ${b.lodgementDays}d lodgement` : ''
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
  const cells = useMemo(() => resolveAll(), [])
  const [selectedId, setSelectedId] = useState<string>('nsw-t1')

  const selected = cells.find((c) => c.scenario.id === selectedId) ?? cells[0]

  const supportedCells = cells.filter((c) => c.scenario.section === 'supported')
  const unsupportedCells = cells.filter((c) => c.scenario.section === 'unsupported')

  const nswRow = supportedCells.filter((c) => c.scenario.rowLabel === 'NSW')
  const vicRow = supportedCells.filter((c) => c.scenario.rowLabel === 'VIC')
  const qldRow = supportedCells.filter((c) => c.scenario.rowLabel === 'QLD')

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">State workflows</h1>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-3xl">
          Read-only mirror of <code className="text-xs bg-gray-100 px-1 rounded">resolveTenancyPackage</code>. Each cell
          uses a canonical <code className="text-xs bg-gray-100 px-1 rounded">TenancyPackageInput</code>; tier is{' '}
          <strong>derived</strong> by the resolver. This shows what the code does, not legal advice. Canonical inputs{' '}
          omit <code className="text-xs bg-gray-100 px-1 rounded">date</code> (ignored in v1).
        </p>
      </header>

      <section className="space-y-4 mb-10">
        <h2 className="text-lg font-semibold text-gray-900">Supported states</h2>
        <div className={`${adminCardClass} overflow-x-auto`}>
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-24">
                  State
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tier 1
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tier 2
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tier 3
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
        <h2 className="text-lg font-semibold text-gray-900">Not yet supported (resolver)</h2>
        <p className="text-sm text-gray-600">
          One probe per state — the resolver returns <code className="text-xs bg-gray-100 px-1 rounded">unsupported_state</code>{' '}
          regardless of tier-like inputs.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {unsupportedCells.map((cell) => (
            <button
              key={cell.scenario.id}
              type="button"
              onClick={() => setSelectedId(cell.scenario.id)}
              className={`rounded-xl border-2 p-3 text-left transition-colors ${
                selectedId === cell.scenario.id
                  ? 'border-[#FF6F61] bg-[#FF6F61]/5'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">{cell.scenario.columnLabel}</p>
              <p className="text-xs font-mono text-gray-500 mt-1">{cell.scenario.id}</p>
              {cell.error ? (
                <p className="text-red-700 text-xs mt-1">{cell.error}</p>
              ) : (
                <p className="text-xs text-gray-600 mt-2 line-clamp-4">{cell.result?.unsupportedReason ?? '—'}</p>
              )}
            </button>
          ))}
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
