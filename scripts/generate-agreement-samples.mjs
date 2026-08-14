import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import React from 'react'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'

import {
  nswAddendumSampleProps,
  nswOccupancySampleProps,
  nswT2AgreementSampleProps,
  nswT3BoardingHouseSampleProps,
  qldAddendumSampleProps,
  qldOccupancySampleProps,
  qldT2AgreementSampleProps,
  vicAddendumSampleProps,
  vicOccupancySampleProps,
  vicT2AgreementSampleProps,
} from './agreement-sample-fixtures.mjs'

globalThis.React = React

const { renderToBuffer } = await import('@react-pdf/renderer')
const { NswLicenceToOccupyOnSite } = await import('../src/lib/documents/nsw/occupancyGenerator.tsx')
const { NswResidentialTenancyAgreement } = await import('../src/lib/documents/NswResidentialTenancyAgreement.tsx')
const { QuniPlatformAddendum } = await import('../src/lib/documents/QuniPlatformAddendum.tsx')
const { QldLicenceToOccupyOnSite } = await import('../src/lib/documents/qld/occupancyGenerator.tsx')
const { fillOfficialQldForm18aPdf } = await import('../api/lib/documents/officialQldForm18aFill.ts')
const { QuniPlatformAddendumQld } = await import('../src/lib/documents/QuniPlatformAddendumQld.tsx')
const { VicLicenceToOccupyOnSite } = await import('../src/lib/documents/vic/occupancyGenerator.tsx')
const { VicResidentialRentalAgreementForm1 } = await import('../src/lib/documents/vic/form1Generator.tsx')
const { QuniPlatformAddendumVic } = await import('../src/lib/documents/vic/addendumGenerator.tsx')
const { NswBoardingHouseOccupancyAgreement } = await import('../src/lib/documents/nsw/boardingHouse/generator.tsx')

const SAMPLE_ROOT = join(process.cwd(), 'public', 'agreement-samples')
const WATERMARK_TEXT = 'SAMPLE - not for execution'

function element(Component, props) {
  return React.createElement(Component, props)
}

async function applyWatermark(pdfBuffer) {
  const doc = await PDFDocument.load(pdfBuffer)
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const pages = doc.getPages()

  for (const page of pages) {
    const { width, height } = page.getSize()
    page.drawText(WATERMARK_TEXT, {
      x: width * 0.12,
      y: height * 0.46,
      size: 36,
      font,
      color: rgb(0.82, 0.2, 0.2),
      rotate: degrees(32),
      opacity: 0.2,
    })
  }

  return Buffer.from(await doc.save())
}

function sanitizeFileName(v) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const samples = [
  {
    state: 'NSW',
    tier: 'T1',
    document: 'Occupancy licence',
    component: NswLicenceToOccupyOnSite,
    props: nswOccupancySampleProps(),
  },
  {
    state: 'NSW',
    tier: 'T2',
    document: 'FT6600 tenancy agreement',
    component: NswResidentialTenancyAgreement,
    props: nswT2AgreementSampleProps(),
  },
  {
    state: 'NSW',
    tier: 'T2',
    document: 'Quni addendum',
    component: QuniPlatformAddendum,
    props: nswAddendumSampleProps(),
  },
  {
    state: 'NSW',
    tier: 'T3',
    document: 'Standard Occupancy Agreement',
    component: NswBoardingHouseOccupancyAgreement,
    props: nswT3BoardingHouseSampleProps(),
  },
  {
    state: 'QLD',
    tier: 'T1',
    document: 'Occupancy agreement',
    component: QldLicenceToOccupyOnSite,
    props: qldOccupancySampleProps(),
  },
  {
    state: 'QLD',
    tier: 'T2',
    document: 'General tenancy agreement (Form 18a)',
    officialQldForm18a: true,
    props: qldT2AgreementSampleProps(),
  },
  {
    state: 'QLD',
    tier: 'T2',
    document: 'Quni addendum',
    component: QuniPlatformAddendumQld,
    props: qldAddendumSampleProps(),
  },
  {
    state: 'VIC',
    tier: 'T1',
    document: 'Licence to occupy',
    component: VicLicenceToOccupyOnSite,
    props: vicOccupancySampleProps(),
  },
  {
    state: 'VIC',
    tier: 'T2',
    document: 'Form 1',
    component: VicResidentialRentalAgreementForm1,
    props: vicT2AgreementSampleProps(),
  },
  {
    state: 'VIC',
    tier: 'T2',
    document: 'Quni addendum',
    component: QuniPlatformAddendumVic,
    props: vicAddendumSampleProps(),
  },
]

const onlyKey = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length) ?? null

function sampleKey(sample) {
  return `${sample.state}-${sample.tier}`
}

const selected = onlyKey ? samples.filter((sample) => sampleKey(sample) === onlyKey) : samples
if (selected.length === 0) {
  console.error(`No samples matched --only=${onlyKey}`)
  process.exit(1)
}

if (!onlyKey) {
  rmSync(SAMPLE_ROOT, { recursive: true, force: true })
}
mkdirSync(SAMPLE_ROOT, { recursive: true })

const written = []

for (const sample of selected) {
  const fileName = `${sanitizeFileName(sample.state)}-${sanitizeFileName(sample.tier)}-${sanitizeFileName(sample.document)}.pdf`
  const outputPath = join(SAMPLE_ROOT, fileName)
  const rawBuffer = sample.officialQldForm18a
    ? Buffer.from((await fillOfficialQldForm18aPdf(sample.props)).pdfBytes)
    : await renderToBuffer(element(sample.component, sample.props))
  const watermarked = await applyWatermark(rawBuffer)
  writeFileSync(outputPath, watermarked)
  written.push({
    state: sample.state,
    tier: sample.tier,
    document: sample.document,
    fileName,
    href: `/agreement-samples/${fileName}`,
  })
  console.log('Written:', outputPath)
}

const manifestPath = join(SAMPLE_ROOT, 'manifest.json')
const preferredOrder = samples.map(
  (sample) => `${sanitizeFileName(sample.state)}-${sanitizeFileName(sample.tier)}-${sanitizeFileName(sample.document)}.pdf`,
)

function orderedSamples(entries) {
  const byFile = new Map(entries.map((entry) => [entry.fileName, entry]))
  const ordered = []
  for (const fileName of preferredOrder) {
    const entry = byFile.get(fileName)
    if (entry) {
      ordered.push(entry)
      byFile.delete(fileName)
    }
  }
  ordered.push(...byFile.values())
  return ordered
}

let existingSamples = []
if (onlyKey && existsSync(manifestPath)) {
  try {
    const prev = JSON.parse(readFileSync(manifestPath, 'utf8'))
    if (Array.isArray(prev.samples)) existingSamples = prev.samples
  } catch {
    existingSamples = []
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  watermark: WATERMARK_TEXT,
  samples: orderedSamples([...existingSamples, ...written]),
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log('Written:', manifestPath)
