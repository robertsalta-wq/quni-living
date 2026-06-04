/**
 * Regenerate Quinn/Robert Listing FT6600 draft (flattened PDF QA artifact).
 * Run: npx tsx scripts/generate-ft6600-quinn-robert-draft.mjs
 *
 * DocuSeal completion smoke (0 {{ after sign) is blocked until sign.quni.com.au DNS is wired.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFParse } from 'pdf-parse'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const spikeDir = path.join(root, 'scripts', 'test-official-form-spike')

const { buildNswResidentialTenancyAgreementPropsFromBooking } = await import(
  '../api/lib/documents/buildNswFt6600AgreementProps.ts'
)
const { QUINN_ROBERT_FT6600_LISTING_INPUT } = await import(
  '../api/lib/documents/quinnRobertFt6600Fixture.ts'
)
const {
  buildOfficialNswFt6600PdfWithSigning,
  OFFICIAL_FT6600_TIS_PAGE_INDEX,
  OFFICIAL_FT6600_TIS_SIGNATURE_ANCHOR,
  OFFICIAL_FT6600_TIS_DATE_ANCHOR,
} = await import('../api/lib/documents/officialNswFt6600Signing.ts')
const { loadOfficialNswFt6600Template, applyOfficialNswFt6600ScheduleFill } = await import(
  '../api/lib/documents/officialNswFt6600Fill.ts'
)
const { FT6600_RENAMED_FIELDS: F } = await import('../api/lib/documents/ft6600RenamedFields.ts')

const QUINN_ROBERT_LISTING = QUINN_ROBERT_FT6600_LISTING_INPUT

/** p18 TIS target from docs/nsw/ft6600-corrected-field-map.json (no AcroForm on page 18 in template). */
const P18_TIS_FIELD_MAP = {
  note: 'pdfjs lists zero AcroForm fields on page 18; sig_tenant_tis AcroForm widget is wrongly on page 17',
  sig_tenant_tis: { pageHuman: 18, rect: [34.0, 389.7, 215.4, 426.5] },
    tenant_tis_sig_day: { pageHuman: 18, rect: [251.9, 407.3, 287.4, 426.4] },
    tenant_tis_sig_month: { pageHuman: 18, rect: [325.6, 407.3, 427.9, 426.4] },
  wrongP17Acroform: {
    sig_tenant_tis: { pageHuman: 17, rect: [34.0157, 415.377, 215.433, 452.161] },
    tenant_tis_sig_day: { pageHuman: 17, rect: [251.868, 415.471, 287.432, 434.562] },
  },
}

async function readScheduleSpotCheck(props) {
  const doc = await loadOfficialNswFt6600Template()
  applyOfficialNswFt6600ScheduleFill(doc, props)
  const form = doc.getForm()
  return {
    agreementAt: form.getTextField(F.agreement_at).getText(),
    landlordEserviceYes: form.getCheckBox(F.landlord_eservice_yes_cb).isChecked(),
    tenantEserviceYes: form.getCheckBox(F.tenant_eservice_yes_cb).isChecked(),
    landlordEmail: form.getTextField(F.landlord_email_for_service).getText(),
    tenantEmail: form.getTextField(F.tenant_email_for_service).getText(),
  }
}

async function scanTags(buf) {
  const parser = new PDFParse({ data: buf })
  const text = (await parser.getText()).text || ''
  await parser.destroy()
  const curlyCount = (text.match(/\{\{/g) || []).length
  const marginLandlordSig = text.includes('{{Landlord Signature;role=First Party;type=signature}}') &&
    text.indexOf('{{Landlord Signature') < text.indexOf('SIGNED BY THE LANDLORD')
  return { curlyCount, tagLiteralCount: curlyCount }
}

const props = buildNswResidentialTenancyAgreementPropsFromBooking(QUINN_ROBERT_LISTING)
const built = await buildOfficialNswFt6600PdfWithSigning(props, { includeCoTenantSignatureTags: false })
const schedule = await readScheduleSpotCheck(props)

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const outName = `quinn-robert-ft6600-filled-listing-new-${stamp}.pdf`
const outPath = path.join(spikeDir, outName)
fs.mkdirSync(spikeDir, { recursive: true })
fs.writeFileSync(outPath, built.pdfBytes)

const tagScan = await scanTags(built.pdfBytes)
const tisPlacements = built.widgetTagPlacements.filter((p) =>
  /tis/i.test(p.fieldName) || /TIS/.test(p.tag),
)
const p17Tis = tisPlacements.filter((p) => p.pageIndex === 16)
const p18Tis = tisPlacements.filter((p) => p.pageIndex === OFFICIAL_FT6600_TIS_PAGE_INDEX)

const report = {
  generatedAt: new Date().toISOString(),
  output: path.relative(root, outPath),
  bytes: fs.statSync(outPath).size,
  p18TisFieldMap: P18_TIS_FIELD_MAP,
  tisCoordinateAnchorsUsed: {
    sig_tenant_tis: OFFICIAL_FT6600_TIS_SIGNATURE_ANCHOR,
    tenant_tis_sig_month: OFFICIAL_FT6600_TIS_DATE_ANCHOR,
  },
  verification: {
    hasDocusealTags: built.hasDocusealTags,
    tagCount: built.tagCount,
    noMarginAnchors: built.tagCount === 8,
    tisOnPage18Only: p18Tis.length === 2 && p17Tis.length === 0,
    landlordEserviceYes: schedule.landlordEserviceYes,
    tenantEserviceYes: schedule.tenantEserviceYes,
    agreementAt: schedule.agreementAt,
  },
  widgetTagPlacements: built.widgetTagPlacements,
  widgetTagFieldNames: built.widgetTagFieldNames,
  tagScan,
  docusealCompletionSmoke: 'BLOCKED — sign.quni.com.au DNS not wired; do not verify 0 {{ via live /s/... submission',
}

const reportPath = path.join(spikeDir, 'quinn-robert-ft6600-draft-report.json')
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
