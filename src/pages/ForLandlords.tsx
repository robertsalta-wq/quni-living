import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Seo from '../components/Seo'
import '../components/desk/desk.css'
import {
  LandlordCalculatorSection,
  LandlordClosingBand,
  LandlordGatePanel,
  LandlordGrandDesk,
  LandlordHowItWorks,
  LandlordIfWrongSection,
  LandlordPapersBlock,
  LandlordStateSelector,
  LandlordStickyPen,
  LandlordTwoUpPanels,
} from '../components/forLandlords'
import {
  FOR_LANDLORDS_DESCRIPTION,
  FOR_LANDLORDS_PATH,
  buildForLandlordsJsonLd,
} from '../lib/forLandlordsDeskContent'
import type { LandlordDeskState } from '../lib/forLandlordsState'
import { SITE_CONTENT_MAX_CLASS, SITE_URL } from '../lib/site'

const settle = (delayMs: number): CSSProperties => ({ animationDelay: `${delayMs}ms` })

/**
 * Landlord Office v20 — vertical descent on /for-landlords (preview branch).
 * Self-contained: read down, list or leave. No global header/footer.
 */
export default function ForLandlords() {
  const [state, setState] = useState<LandlordDeskState>('NSW')
  const [stickyVisible, setStickyVisible] = useState(false)
  const deskEndRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef<HTMLElement>(null)
  const jsonLd = buildForLandlordsJsonLd(SITE_URL)

  useEffect(() => {
    const deskEnd = deskEndRef.current
    const closing = closingRef.current
    if (!deskEnd || !closing) return

    function updateSticky() {
      const pastDesk = deskEnd!.getBoundingClientRect().top <= 0
      const closingTop = closing!.getBoundingClientRect().top
      const atClosing = closingTop < window.innerHeight * 0.9
      setStickyVisible(pastDesk && !atClosing)
    }

    updateSticky()
    window.addEventListener('scroll', updateSticky, { passive: true })
    window.addEventListener('resize', updateSticky, { passive: true })
    return () => {
      window.removeEventListener('scroll', updateSticky)
      window.removeEventListener('resize', updateSticky)
    }
  }, [])

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[var(--quni-surface-2)] text-[var(--quni-ink-3)]">
      <Seo
        title="List a room — for landlords"
        description={FOR_LANDLORDS_DESCRIPTION}
        canonicalPath={FOR_LANDLORDS_PATH}
        jsonLd={jsonLd}
        noindex
      />

      <main className={`${SITE_CONTENT_MAX_CLASS} flex flex-1 flex-col gap-2.5 py-3 sm:gap-3 sm:py-4`}>
        <LandlordGrandDesk className="desk-settle" style={settle(40)} />
        <div ref={deskEndRef} className="h-px w-full" aria-hidden />

        <LandlordStateSelector
          state={state}
          onChange={setState}
          className="desk-settle"
          style={settle(80)}
        />

        <LandlordGatePanel state={state} className="desk-settle" style={settle(120)} />

        <LandlordHowItWorks className="desk-settle" style={settle(160)} />

        <LandlordTwoUpPanels className="desk-settle" style={settle(200)} />

        <LandlordCalculatorSection className="desk-settle" style={settle(280)} />

        <LandlordIfWrongSection state={state} className="desk-settle" style={settle(360)} />

        <LandlordClosingBand ref={closingRef} className="desk-settle" style={settle(440)} />

        <LandlordPapersBlock className="desk-settle" style={settle(500)} />
      </main>

      <LandlordStickyPen visible={stickyVisible} />
    </div>
  )
}
