/**
 * Unit tests for scripts/appChromeLint.mjs — planted fail + allowlist pass cases.
 * See docs/app-chrome-brief.md §6.
 */
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findChromeViolations } from '../../scripts/appChromeLint.mjs'

describe('findChromeViolations', () => {
  it('flags brand-header-bg outside the allowlist', () => {
    const src = `<header className="bg-[var(--brand-header-bg)] border-b">Chrome</header>`
    const v = findChromeViolations('src/pages/SomePage.tsx', src)
    expect(v.some((x) => x.id === 'brand-header-bg')).toBe(true)
  })

  it('flags mobile bottom-bar placement (border-t + sm:hidden) outside AppActionBar', () => {
    const src = `<nav className="shrink-0 border-t border-gray-200 bg-white px-2 pt-2 sm:hidden">Tabs</nav>`
    const v = findChromeViolations('src/components/FakeBottomNav.tsx', src)
    expect(v.some((x) => x.id === 'bottom-bar-placement')).toBe(true)
  })

  it('flags re-import of deleted LandlordMobileBottomNav / RenterMobileBottomNav', () => {
    const landlord = `import X from '../landlord/LandlordMobileBottomNav'\n`
    const renter = `import Y from '../student/RenterMobileBottomNav'\n`
    expect(
      findChromeViolations('src/components/appShell/AppShellLayout.tsx', landlord).some(
        (x) => x.id === 'deleted-bottom-nav-import',
      ),
    ).toBe(true)
    expect(
      findChromeViolations('src/components/appShell/AppShellLayout.tsx', renter).some(
        (x) => x.id === 'deleted-bottom-nav-import',
      ),
    ).toBe(true)
  })

  it('stays silent on ConversationHeader-style in-page chrome (no shell tokens / placement)', () => {
    const src = `
      export default function ConversationHeader() {
        return (
          <div className="flex items-center gap-2.5 border-b border-gray-100 bg-white px-3 py-2">
            <p className="text-sm font-semibold text-gray-900 hover:text-[var(--quni-coral)]">Title</p>
          </div>
        )
      }
    `
    expect(findChromeViolations('src/components/messaging/ConversationHeader.tsx', src)).toEqual([])
  })

  it('flags Tailwind arbitrary-hex colours on non-legacy files', () => {
    const dirty = `<div className="rounded-xl border border-[#123456] bg-white" />`
    const v = findChromeViolations('src/pages/HexLintProbe.tsx', dirty)
    expect(v.some((x) => x.id === 'tailwind-arbitrary-hex')).toBe(true)

    const clean = `<div className="rounded-xl border border-[var(--quni-line)] bg-white" />`
    expect(
      findChromeViolations('src/pages/HexLintProbe.tsx', clean).filter(
        (x) => x.id === 'tailwind-arbitrary-hex',
      ),
    ).toEqual([])
  })

  it('flags Batch-1 canonical brand hex literals', () => {
    const dirty = `const c = '#FF6F61'\n`
    const v = findChromeViolations('src/pages/Batch1HexProbe.tsx', dirty)
    expect(v.some((x) => x.id === 'canonical-brand-hex')).toBe(true)

    const batch2 = `const soft = '#FFF8F0'\n`
    expect(
      findChromeViolations('src/pages/Batch2HexProbe.tsx', batch2).some(
        (x) => x.id === 'canonical-brand-hex',
      ),
    ).toBe(true)
  })

  it('allowlists Stripe colorPrimary and theme-color lines for Batch-1 hex', () => {
    const stripe = `appearance: { theme: 'stripe', variables: { colorPrimary: '#FF6F61' } },\n`
    expect(
      findChromeViolations('src/pages/Booking.tsx', stripe).filter((x) => x.id === 'canonical-brand-hex'),
    ).toEqual([])

    const theme = `<meta name="theme-color" content="#FF6F61" />\n`
    expect(
      findChromeViolations('src/components/Seo.tsx', theme).filter((x) => x.id === 'canonical-brand-hex'),
    ).toEqual([])

    const themeSingle = `<meta name='theme-color' content='#FF6F61' />\n`
    expect(
      findChromeViolations('src/components/Seo.tsx', themeSingle).filter(
        (x) => x.id === 'canonical-brand-hex',
      ),
    ).toEqual([])
  })

  it('skips Batch-1 hex checks under src/lib/documents', () => {
    const src = `const coral = '#FF6F61'\n`
    expect(
      findChromeViolations('src/lib/documents/quniDocumentPdfTheme.tsx', src).filter(
        (x) => x.id === 'canonical-brand-hex',
      ),
    ).toEqual([])
  })

  it('stays silent on in-hub titles using surface/line tokens (not chrome tokens)', () => {
    const src = `
      <h1 className="text-[15px] font-bold text-[var(--quni-ink)] border-b border-[var(--quni-line-soft)]">
        Listing health
      </h1>
    `
    expect(findChromeViolations('src/components/landlord/listingHub/ListingHealthHub.tsx', src)).toEqual(
      [],
    )
  })

  it('allowlists ChromeHeaderShell + AppActionBar; Header/AppHeader must not redeclare geometry', () => {
    const shellSrc = readFileSync(join(process.cwd(), 'src/components/ChromeHeaderShell.tsx'), 'utf8')
    const barSrc = readFileSync(join(process.cwd(), 'src/components/appShell/AppActionBar.tsx'), 'utf8')
    const headerSrc = readFileSync(join(process.cwd(), 'src/components/appShell/AppHeader.tsx'), 'utf8')
    const marketingSrc = readFileSync(join(process.cwd(), 'src/components/Header.tsx'), 'utf8')
    expect(findChromeViolations('src/components/ChromeHeaderShell.tsx', shellSrc)).toEqual([])
    expect(findChromeViolations('src/components/appShell/AppActionBar.tsx', barSrc)).toEqual([])
    expect(findChromeViolations('src/components/appShell/AppHeader.tsx', headerSrc)).toEqual([])
    expect(findChromeViolations('src/components/Header.tsx', marketingSrc)).toEqual([])
  })

  it('flags pt-safe-top + z-50 + border-b placement outside allowlist', () => {
    const src = `<header className="z-50 w-full border-b border-gray-200 bg-white pt-safe-top">X</header>`
    const v = findChromeViolations('src/pages/HandRolled.tsx', src)
    expect(v.some((x) => x.id === 'header-safe-area-placement')).toBe(true)
  })

  it('flags hand-rolled card chrome on non-legacy files', () => {
    const dirty = `<div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" />`
    const v = findChromeViolations('src/pages/CardLintProbe.tsx', dirty)
    expect(v.some((x) => x.id === 'hand-rolled-card')).toBe(true)

    const viaPrimitive = `<div className="quni-card p-5" />`
    expect(
      findChromeViolations('src/pages/CardLintProbe.tsx', viaPrimitive).filter(
        (x) => x.id === 'hand-rolled-card',
      ),
    ).toEqual([])
  })

  it('skips chips, buttons, inputs, and py-only menus; still flags content cards', () => {
    const chip = `<span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm" />`
    expect(
      findChromeViolations('src/pages/CardLintProbe.tsx', chip).filter((x) => x.id === 'hand-rolled-card'),
    ).toEqual([])

    const inlineFlexBtn = `<button className="inline-flex rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm" />`
    expect(
      findChromeViolations('src/pages/CardLintProbe.tsx', inlineFlexBtn).filter(
        (x) => x.id === 'hand-rolled-card',
      ),
    ).toEqual([])

    const hoverBtn = `<button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50" />`
    expect(
      findChromeViolations('src/pages/CardLintProbe.tsx', hoverBtn).filter(
        (x) => x.id === 'hand-rolled-card',
      ),
    ).toEqual([])

    const input = `<input className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm placeholder:text-gray-400 focus:ring-2" />`
    expect(
      findChromeViolations('src/pages/CardLintProbe.tsx', input).filter(
        (x) => x.id === 'hand-rolled-card',
      ),
    ).toEqual([])

    const menu = `<div className="absolute z-20 rounded-xl border border-gray-100 bg-white py-1 shadow-lg" />`
    expect(
      findChromeViolations('src/pages/CardLintProbe.tsx', menu).filter(
        (x) => x.id === 'hand-rolled-card',
      ),
    ).toEqual([])

    const card = `<div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" />`
    expect(
      findChromeViolations('src/pages/CardLintProbe.tsx', card).some((x) => x.id === 'hand-rolled-card'),
    ).toBe(true)
  })

  it('skips fixed/absolute+z overlays; still flags sticky and in-flow cards', () => {
    const fixedToast = `<div className="fixed bottom-8 left-1/2 z-[80] rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-lg" />`
    expect(
      findChromeViolations('src/pages/CardLintProbe.tsx', fixedToast).filter(
        (x) => x.id === 'hand-rolled-card',
      ),
    ).toEqual([])

    const absolutePopover = `<div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-xl border border-gray-100 bg-white p-3 shadow-lg" />`
    expect(
      findChromeViolations('src/pages/CardLintProbe.tsx', absolutePopover).filter(
        (x) => x.id === 'hand-rolled-card',
      ),
    ).toEqual([])

    const stickyCard = `<div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" />`
    expect(
      findChromeViolations('src/pages/CardLintProbe.tsx', stickyCard).some(
        (x) => x.id === 'hand-rolled-card',
      ),
    ).toBe(true)

    const inFlowCard = `<div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" />`
    expect(
      findChromeViolations('src/pages/CardLintProbe.tsx', inFlowCard).some(
        (x) => x.id === 'hand-rolled-card',
      ),
    ).toBe(true)
  })

  it('allowlists primitive card wrappers; empty containerLegacy means pages are locked', () => {
    const dirty = `<div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" />`
    // containerLegacy.json is empty — formerly grandfathered pages are actively locked.
    expect(
      findChromeViolations('src/pages/LandlordDashboard.tsx', dirty).some(
        (x) => x.id === 'hand-rolled-card',
      ),
    ).toBe(true)
    expect(
      findChromeViolations('src/components/ui/Section.tsx', dirty).filter(
        (x) => x.id === 'hand-rolled-card',
      ),
    ).toEqual([])
  })

  it('flags hand-rolled modal chrome on non-legacy files', () => {
    const dirty = `<div className="relative z-10 max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl" />`
    const v = findChromeViolations('src/pages/ModalLintProbe.tsx', dirty)
    expect(v.some((x) => x.id === 'hand-rolled-modal')).toBe(true)

    const viaPrimitive = `<div className="quni-modal relative z-10 max-w-md p-6" />`
    expect(
      findChromeViolations('src/pages/ModalLintProbe.tsx', viaPrimitive).filter(
        (x) => x.id === 'hand-rolled-modal',
      ),
    ).toEqual([])
  })

  it('skips dropdowns without dialog tell; allowlists LegalDocumentModal for modal rule', () => {
    const dropdown = `<div className="absolute z-30 mt-1 min-w-[180px] rounded-admin-md border border-admin-line bg-white shadow-admin-modal" />`
    expect(
      findChromeViolations('src/pages/ModalLintProbe.tsx', dropdown).filter(
        (x) => x.id === 'hand-rolled-modal',
      ),
    ).toEqual([])

    const dirty = `<div className="relative z-10 max-w-md rounded-2xl border bg-white p-6 shadow-xl" />`
    expect(
      findChromeViolations('src/components/legal/LegalDocumentModal.tsx', dirty).filter(
        (x) => x.id === 'hand-rolled-modal',
      ),
    ).toEqual([])
  })
})

describe('app chrome lint guard CLI (§6)', () => {
  it('passes on the current tree (no hand-rolled chrome outside the shells)', () => {
    const script = join(process.cwd(), 'scripts', 'check-app-chrome.mjs')
    const out = execFileSync(process.execPath, [script], {
      encoding: 'utf8',
      cwd: process.cwd(),
    })
    expect(out).toContain('ok')
  })
})
