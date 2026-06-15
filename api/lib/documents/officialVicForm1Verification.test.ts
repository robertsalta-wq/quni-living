import { afterAll, describe, expect, it } from 'vitest'
import { fillOfficialVicForm1Pdf } from './officialVicForm1Fill.js'
import { vicForm1RepresentativeFixtureProps } from './vicForm1RepresentativeFixture.js'
import { pdftoppmAvailable } from './vicForm1PdftoppmRaster.js'
import {
  assertVicForm1BlankPdfSha256Pinned,
  formatGateReport,
  runCheckboxCorrectnessGate,
  runFilledVsBlankRegionDiffGate,
  runOverflowFixturesGate,
  runPerSlotCoordinateReadBackGate,
  runSigningSmokeGate,
  type VicForm1GateResult,
} from './vicForm1VerificationGates.js'

const root = process.cwd()
const gateResults: VicForm1GateResult[] = []
const rasterTimeoutMs = 120_000

function recordGate(result: VicForm1GateResult): void {
  gateResults.push(result)
}

const rasterAvailable = pdftoppmAvailable()

describe('VIC Form 1 verification suite', () => {
  describe('gate 0: blank PDF SHA256 pin', () => {
    it('loads docs/vic/form-1-blank.pdf and matches map sourcePdfSha256', () => {
      const sha = assertVicForm1BlankPdfSha256Pinned(root)
      expect(sha).toMatch(/^[a-f0-9]{64}$/)
      recordGate({ gate: 'blank PDF SHA256 pin', pass: true })
    })
  })

  describe.skipIf(!rasterAvailable)('gate 1: filled-vs-blank region diff', () => {
    it(
      'allows pixel diffs only inside padded coordinate-map field rects',
      async () => {
        const props = vicForm1RepresentativeFixtureProps()
        const { pdfBytes } = await fillOfficialVicForm1Pdf(props, { root })
        const result = await runFilledVsBlankRegionDiffGate(pdfBytes, root)
        recordGate(result)

        expect(result.outOfRegionPixelsByPage).toBeDefined()
        for (const count of Object.values(result.outOfRegionPixelsByPage ?? {})) {
          expect(count).toBe(0)
        }
        expect(result.pass).toBe(true)
      },
      rasterTimeoutMs,
    )
  })

  describe('gate 2: per-slot coordinate read-back', () => {
    it('asserts each filled value bbox sits inside its mapped cell rect', async () => {
      const props = vicForm1RepresentativeFixtureProps()
      const { pdfBytes } = await fillOfficialVicForm1Pdf(props, { root })
      const result = await runPerSlotCoordinateReadBackGate(pdfBytes, props, root)
      recordGate(result)
      expect(result.pass).toBe(true)
    })
  })

  describe.skipIf(!rasterAvailable)('gate 3: checkbox correctness', () => {
    it(
      'ticks exactly the intended boxes for the representative fixture',
      async () => {
        const props = vicForm1RepresentativeFixtureProps()
        const { pdfBytes } = await fillOfficialVicForm1Pdf(props, { root })
        const result = await runCheckboxCorrectnessGate(pdfBytes, props, root)
        recordGate(result)
        expect(result.pass).toBe(true)
      },
      rasterTimeoutMs,
    )
  })

  describe.skipIf(!rasterAvailable)('gate 4: overflow fixtures', () => {
    it(
      'keeps long values inside their boxes; item 21 flags continuation when truncated',
      async () => {
        const result = await runOverflowFixturesGate(root)
        recordGate(result)

        const item21 = result.cases.find((c) => c.case === 'long item 21 note')
        expect(item21?.continuationRequired).toBe(true)
        expect(result.pass).toBe(true)
      },
      rasterTimeoutMs,
    )
  })

  describe('gate 5: signing smoke', () => {
    it('places expected DocuSeal tags at mapped cells (2 signers, no co-tenant)', async () => {
      const props = vicForm1RepresentativeFixtureProps()
      props.additionalTenantNames = []
      const result = await runSigningSmokeGate(props, false, root)
      recordGate(result)
      expect(result.pass).toBe(true)
    })

    it('places expected DocuSeal tags at mapped cells (3 signers, co-tenant present)', async () => {
      const props = vicForm1RepresentativeFixtureProps()
      const result = await runSigningSmokeGate(props, true, root)
      recordGate(result)
      expect(result.pass).toBe(true)
    })
  })

  afterAll(() => {
    if (gateResults.length > 0) {
      // eslint-disable-next-line no-console -- verification suite gate report
      console.log('\n' + formatGateReport(gateResults))
    }
  })
})
