/**
 * Manual visual check — run: npx vitest run src/lib/documents/qld/occupancyGenerator.raster.test.ts
 */
import { describe, expect, it } from 'vitest'
import React from 'react'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { renderToBuffer } from '@react-pdf/renderer'
import { QldLicenceToOccupyOnSite } from './occupancyGenerator.tsx'
import type { OccupancyAgreementProps } from '../../../api/documents/rtaTypes.js'

function minimalProps(): OccupancyAgreementProps {
  return {
    documentId: 'visual-check-qld',
    generatedAt: '15 Jun 2026, 12:00:00 pm',
    serviceTier: 'listing',
    landlord: {
      fullName: 'Jane Owner',
      companyName: null,
      addressLine: '1 Example St, Brisbane QLD 4000',
      email: 'jane@example.com',
      phone: '0400 000 000',
    },
    tenant: {
      fullName: 'Alex Resident',
      email: 'alex@example.com',
      phone: '0401 000 000',
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
    },
    premises: {
      addressLine: '2 Demo Rd, Brisbane QLD 4001',
      propertyType: 'private_room_landlord_on_site',
      roomType: 'Private room',
      furnished: true,
      linenSupplied: false,
      weeklyCleaningService: false,
    },
    term: {
      startDate: '2025-07-15',
      endDate: '2026-01-15',
      periodic: false,
      leaseLengthDescription: '52 weeks',
    },
    rent: {
      weeklyRent: 300,
      platformFeePercent: 0,
      totalWeekly: 300,
      paymentMethod: 'Direct credit to owner account (fee-free)',
    },
    bond: { amount: 1200 },
    specialConditions: [],
    bookingNotes: null,
    houseRules: null,
  }
}

describe('QldLicenceToOccupyOnSite raster', () => {
  it('writes PDF + PNG pages for visual s 32 / RTA review', async () => {
    const buf = await renderToBuffer(
      React.createElement(QldLicenceToOccupyOnSite, minimalProps()) as Parameters<typeof renderToBuffer>[0],
    )
    const outDir = join(process.cwd(), 'scripts/test-official-form-spike')
    mkdirSync(outDir, { recursive: true })
    const pdfPath = join(outDir, 'qld-occupancy-s32-visual-check.pdf')
    writeFileSync(pdfPath, buf)
    const pngBase = join(outDir, 'qld-occupancy-s32-visual-check')
    execSync(`pdftoppm -png -r 150 "${pdfPath}" "${pngBase}"`, { stdio: 'inherit' })
    expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
  })
})
