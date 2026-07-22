import { useState } from 'react'
import { RENTER_SITUATION_OPTIONS, type RenterSituation } from '../../../lib/renterSituation'
import { routeSectionTitle as routeTitleForSituation } from '../../../lib/renterProfileSection'
import { Check, Pencil, ProfileSectionIcon, SITUATION_TILE_ICONS } from './profileSectionIcons'

type Props = {
  currentSituation: RenterSituation | null
  onSelect: (situation: RenterSituation) => void
  busy?: boolean
  error?: string | null
}

function situationSummary(situation: RenterSituation): string {
  const label = RENTER_SITUATION_OPTIONS.find((o) => o.value === situation)?.label ?? situation
  const route = routeTitleForSituation(situation)
  return `${label} · ${route}`
}

export function RenterSituationSection({ currentSituation, onSelect, busy = false, error }: Props) {
  const [editing, setEditing] = useState(currentSituation == null)
  const collapsed = currentSituation != null && !editing

  return (
    <section id="renter-section-situation" className="quni-card overflow-hidden font-sans scroll-mt-below-header">
      <div
        className="renter-profile-card-header renter-profile-card-header-static renter-profile-card-header-situation"
      >
        <div className="renter-profile-icon-wrap renter-profile-icon-wrap-lg">
          <ProfileSectionIcon kind="situation" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="renter-profile-section-title">Your situation</span>
          {collapsed ? (
            <div className="renter-profile-section-summary">{situationSummary(currentSituation!)}</div>
          ) : (
            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--quni-ink-4)' }}>
              Tell us your situation so we ask for the right details.
            </p>
          )}
        </div>
        {collapsed ? (
          <>
            <span className="renter-profile-pill renter-profile-pill-done">
              <Check size={13} strokeWidth={3} aria-hidden />
              Done
            </span>
            <button
              type="button"
              className="renter-profile-edit-btn"
              disabled={busy}
              onClick={() => setEditing(true)}
            >
              <Pencil size={13} aria-hidden />
              Edit
            </button>
          </>
        ) : currentSituation != null && editing ? (
          <button
            type="button"
            className="renter-profile-edit-btn"
            disabled={busy}
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        ) : (
          <span className="renter-profile-pill renter-profile-pill-todo">To do</span>
        )}
      </div>

      {!collapsed ? (
        <div className="renter-profile-section-body">
          <div className="renter-profile-section-body-inner">
            {error ? (
              <p className="renter-profile-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="renter-profile-situation-grid">
              {RENTER_SITUATION_OPTIONS.map((opt) => {
                const selected = currentSituation === opt.value
                const TileIcon = SITUATION_TILE_ICONS[opt.value]
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      onSelect(opt.value)
                      if (currentSituation != null) setEditing(false)
                    }}
                    className={`renter-profile-situation-tile${selected ? ' renter-profile-situation-tile-selected' : ''}`}
                  >
                    {selected ? (
                      <span
                        style={{
                          position: 'absolute',
                          top: 9,
                          right: 9,
                          width: 19,
                          height: 19,
                          borderRadius: 'var(--radius-pill)',
                          background: 'var(--quni-coral)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        aria-hidden
                      >
                        <Check size={11} color="#fff" strokeWidth={3.5} />
                      </span>
                    ) : null}
                    <TileIcon
                      size={26}
                      strokeWidth={1.8}
                      color={selected ? 'var(--quni-coral)' : 'var(--quni-ink-2)'}
                      aria-hidden
                    />
                    <span className="renter-profile-situation-tile-label">{opt.label}</span>
                  </button>
                )
              })}
            </div>
            <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--quni-ink-5)' }}>
              Your choice sets which details we ask for next.
            </p>
            {busy ? (
              <p style={{ marginTop: 8, fontSize: 12.5, color: 'var(--quni-ink-5)' }} aria-live="polite">
                Saving your choice…
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
