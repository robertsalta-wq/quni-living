/**
 * Render sample NSW on-site licence PDF for review.
 * Output: scripts/test-nsw-occupancy-t1.pdf (gitignored via scripts/*.pdf)
 *
 * Run: npx tsx scripts/test-nsw-occupancy-t1.mjs
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import React from 'react'
import { nswOccupancySampleProps } from './agreement-sample-fixtures.mjs'

globalThis.React = React

const { renderToBuffer } = await import('@react-pdf/renderer')
const { NswLicenceToOccupyOnSite } = await import('../src/lib/documents/nsw/occupancyGenerator.tsx')

const props = nswOccupancySampleProps()

const el = React.createElement(NswLicenceToOccupyOnSite, props)
const buffer = await renderToBuffer(el)
const outPath = join(process.cwd(), 'scripts', 'test-nsw-occupancy-t1.pdf')
writeFileSync(outPath, buffer)
console.log('Written:', outPath)
