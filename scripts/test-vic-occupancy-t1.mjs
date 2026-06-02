/**
 * Render sample VIC on-site licence-to-occupy PDF (Part A review).
 * Output: scripts/test-vic-occupancy-t1.pdf (gitignored via scripts/*.pdf)
 *
 * Run: npx tsx scripts/test-vic-occupancy-t1.mjs
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import React from 'react'
import { vicOccupancySampleProps } from './agreement-sample-fixtures.mjs'

globalThis.React = React

const { renderToBuffer } = await import('@react-pdf/renderer')
const { VicLicenceToOccupyOnSite } = await import('../src/lib/documents/vic/occupancyGenerator.tsx')

/** @type {import('../api/documents/rtaTypes.js').OccupancyAgreementProps} */
const props = vicOccupancySampleProps()

const el = React.createElement(VicLicenceToOccupyOnSite, props)
const buffer = await renderToBuffer(el)
const outPath = join(process.cwd(), 'scripts', 'test-vic-occupancy-t1.pdf')
writeFileSync(outPath, buffer)
console.log('Written:', outPath)
