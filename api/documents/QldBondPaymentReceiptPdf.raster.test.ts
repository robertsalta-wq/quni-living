import React from 'react'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { QldBondPaymentReceiptPdf } from './QldBondPaymentReceiptPdf.js'

describe('QldBondPaymentReceiptPdf raster', () => {
  it('writes PDF + PNG for visual payment-receipt review', async () => {
    const buf = await renderToBuffer(
      React.createElement(QldBondPaymentReceiptPdf, {
        receiptNumber: 'QR-2026-ABCDEF',
        dateReceivedDisplay: '15 June 2026',
        propertyAddress: '2 Demo Rd, Brisbane QLD 4001',
        landlordName: 'Jane Owner',
        landlordEmail: 'jane@example.com',
        tenantName: 'Alex Resident',
        amountDisplay: '$1,200.00',
        paymentMethod: 'Bank Transfer',
        notes: null,
        acknowledgementName: 'Jane Owner',
      }) as Parameters<typeof renderToBuffer>[0],
    )
    const outDir = join(process.cwd(), 'scripts/test-official-form-spike')
    mkdirSync(outDir, { recursive: true })
    const pdfPath = join(outDir, 'qld-bond-payment-receipt-visual-check.pdf')
    writeFileSync(pdfPath, buf)
    execSync(`pdftoppm -png -r 150 "${pdfPath}" "${join(outDir, 'qld-bond-payment-receipt-visual-check')}"`, {
      stdio: 'inherit',
    })
    expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
  })
})
