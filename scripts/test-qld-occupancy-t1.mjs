/**
 * Render sample QLD on-site licence PDF for review.
 * Output: scripts/test-qld-occupancy-t1.pdf (gitignored via scripts/*.pdf)
 *
 * Run: npx tsx scripts/test-qld-occupancy-t1.mjs
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import React from 'react'
import { qldOccupancySampleProps } from './agreement-sample-fixtures.mjs'

globalThis.React = React

const { renderToBuffer } = await import('@react-pdf/renderer')
const { QldLicenceToOccupyOnSite } = await import('../src/lib/documents/qld/occupancyGenerator.tsx')

const props = qldOccupancySampleProps()

const el = React.createElement(QldLicenceToOccupyOnSite, props)
const buffer = await renderToBuffer(el)
const outPath = join(process.cwd(), 'scripts', 'test-qld-occupancy-t1.pdf')
writeFileSync(outPath, buffer)
console.log('Written:', outPath)
