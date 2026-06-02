/**
 * Render sample VIC Form 1 + Quni platform addendum PDFs for review (Part A).
 * Output: scripts/test-vic-form1.pdf, scripts/test-vic-addendum.pdf (gitignored).
 *
 * Run: npx tsx scripts/test-vic-form1.mjs
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import React from 'react'
import { vicAddendumSampleProps, vicT2AgreementSampleProps } from './agreement-sample-fixtures.mjs'

/** @react-pdf/renderer via tsx requires React on global for transitive theme modules. */
globalThis.React = React

const { renderToBuffer } = await import('@react-pdf/renderer')
const { VicResidentialRentalAgreementForm1 } = await import(
  '../src/lib/documents/vic/form1Generator.tsx'
)
const { QuniPlatformAddendumVic } = await import('../src/lib/documents/vic/addendumGenerator.tsx')

const form1Props = vicT2AgreementSampleProps()
const addendumProps = vicAddendumSampleProps()

const form1El = React.createElement(VicResidentialRentalAgreementForm1, form1Props)
const addendumEl = React.createElement(QuniPlatformAddendumVic, addendumProps)

const form1Buffer = await renderToBuffer(form1El)
const addendumBuffer = await renderToBuffer(addendumEl)

const form1Path = join(process.cwd(), 'scripts', 'test-vic-form1.pdf')
const addendumPath = join(process.cwd(), 'scripts', 'test-vic-addendum.pdf')

writeFileSync(form1Path, form1Buffer)
writeFileSync(addendumPath, addendumBuffer)

console.log('Written:', form1Path)
console.log('Written:', addendumPath)
