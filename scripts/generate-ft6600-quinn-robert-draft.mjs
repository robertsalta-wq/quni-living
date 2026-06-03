/**
 * Regenerate FT6600 drafts: listing + managed tier, widget tag report, optional DocuSeal smoke.
 * Run: npx tsx scripts/generate-ft6600-quinn-robert-draft.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const spikeDir = path.join(root, 'scripts', 'test-official-form-spike')
const reportPath = path.join(spikeDir, 'quinn-robert-ft6600-draft-report.json')

const { buildNswResidentialTenancyAgreementPropsFromBooking } = await import(
  '../api/lib/documents/buildNswFt6600AgreementProps.ts'
)
const { buildOfficialNswFt6600PdfWithSigning, collectOfficialNswFt6600SignatureWidgets } =
  await import('../api/lib/documents/officialNswFt6600Signing.ts')
const { loadOfficialNswFt6600Template } = await import('../api/lib/documents/officialNswFt6600Fill.ts')
const { FT6600_RENAMED_FIELDS: F } = await import('../api/lib/documents/ft6600RenamedFields.ts')
const { PDFDocument, PDFDict, PDFName } = await import('pdf-lib')

const QUINN_ROBERT_BOOKING_ROWS = {
  documentId: 'nsw-ft6600-quinn-robert',
  generatedAt: '03/06/2026, 10:00:00 am',
  booking: {
    move_in_date: '2026-06-10',
    end_date: '2026-12-10',
    lease_length: '6 months',
    weekly_rent: 400,
    notes: null,
  },
  landlordProfile: {
    first_name: 'Quinn',
    last_name: 'Lee',
    full_name: 'Quinn Lee',
    email: 'quinniele90@gmail.com',
    phone: '+61410025719',
    address: '18 Malvina Street',
    suburb: 'Ryde',
    state: 'NSW',
    postcode: '2112',
    company_name: null,
  },
  studentProfile: {
    first_name: 'Robert',
    last_name: 'Saltalamacchia',
    full_name: 'Robert Saltalamacchia',
    email: 'rob@3thingsatonce.com.au',
    phone: '+61425775308',
    workplace_address: null,
    workplace_suburb: null,
    workplace_state: null,
    workplace_postcode: null,
  },
  property: {
    address: 'Unit 406/311 Hume Highway',
    suburb: 'Liverpool',
    state: 'NSW',
    postcode: '2170',
    max_occupants: 2,
    bond: 800,
    property_type: 'private_room_landlord_off_site',
    room_type: 'Private room',
    furnished: true,
    linen_supplied: true,
    weekly_cleaning_service: false,
    property_features: [{ features: { name: 'Bills included' } }],
  },
  bankDetails: {
    bsb: '939200',
    accountNumber: '823175945',
    accountName: 'QUINNVESTMENTS PTY LTD',
    bankName: 'Bank',
  },
}

const MANAGED_PLATFORM_AGENT = {
  name: 'Quni Living Pty Ltd',
  businessAddress: 'Level 1, 100 Example Street, Sydney, NSW, 2000',
  suburb: 'Sydney',
  phone: '1300 000 000',
  email: 'hello@quni.com.au',
}

function countWidgets(doc) {
  const ctx = doc.context
  let w = 0
  let dangling = 0
  for (const page of doc.getPages()) {
    const annots = page.node.Annots?.()
    if (!annots) continue
    for (let i = 0; i < annots.size(); i++) {
      try {
        const d = ctx.lookup(annots.get(i), PDFDict)
        if (d.get(PDFName.of('Subtype'))?.toString() === '/Widget') w++
      } catch {
        dangling++
      }
    }
  }
  return { widgets: w, danglingAnnotRefs: dangling }
}

async function buildTierDraft(tier) {
  const props = buildNswResidentialTenancyAgreementPropsFromBooking({
    ...QUINN_ROBERT_BOOKING_ROWS,
    serviceTier: tier,
    platformAgentForManaged: tier === 'managed' ? MANAGED_PLATFORM_AGENT : null,
  })
  const built = await buildOfficialNswFt6600PdfWithSigning(props, { includeCoTenantSignatureTags: false })
  return { props, built }
}

async function readScheduleSpotCheck(pdfBytes, props) {
  const doc = await loadOfficialNswFt6600Template()
  // Re-fill unflattened to read agreement_at / agent fields (flatten removes AcroForm)
  const { applyOfficialNswFt6600ScheduleFill } = await import('../api/lib/documents/officialNswFt6600Fill.ts')
  applyOfficialNswFt6600ScheduleFill(doc, props)
  const form = doc.getForm()
  return {
    agreementAt: form.getTextField(F.agreement_at).getText(),
    landlordAgentName: (() => {
      try {
        return form.getTextField(F.landlord_agent_name).getText()
      } catch {
        return ''
      }
    })(),
    landlordAgentAddress: (() => {
      try {
        return form.getTextField(F.landlord_agent_address).getText()
      } catch {
        return ''
      }
    })(),
  }
}

const templateDoc = await loadOfficialNswFt6600Template()
const signatureWidgets = collectOfficialNswFt6600SignatureWidgets(templateDoc)

const listing = await buildTierDraft('listing')
const managed = await buildTierDraft('managed')

const listingSpot = await readScheduleSpotCheck(listing.built.pdfBytes, listing.props)
const managedSpot = await readScheduleSpotCheck(managed.built.pdfBytes, managed.props)

fs.mkdirSync(spikeDir, { recursive: true })

const listingPath = path.join(spikeDir, 'quinn-robert-ft6600-filled-listing.pdf')
const managedPath = path.join(spikeDir, 'quinn-robert-ft6600-filled-managed.pdf')
const legacyPath = path.join(spikeDir, 'quinn-robert-ft6600-filled.pdf')

fs.writeFileSync(listingPath, listing.built.pdfBytes)
fs.writeFileSync(managedPath, managed.built.pdfBytes)
try {
  fs.writeFileSync(legacyPath, listing.built.pdfBytes)
} catch {
  fs.writeFileSync(path.join(spikeDir, 'quinn-robert-ft6600-filled-new.pdf'), listing.built.pdfBytes)
}

const blank = await PDFDocument.load(
  fs.readFileSync(path.join(root, 'docs/nsw/ft6600-renamed.pdf')),
  { ignoreEncryption: true },
)
const filledDoc = await PDFDocument.load(listing.built.pdfBytes, { ignoreEncryption: true })

const report = {
  signatureWidgetsOnTemplate: signatureWidgets.map((w) => ({
    fieldName: w.fieldName,
    pageIndex: w.pageIndex,
    x: w.x,
    y: w.y,
    width: w.width,
    height: w.height,
  })),
  listing: {
    output: path.relative(root, listingPath),
    hasDocusealTags: listing.built.hasDocusealTags,
    tagCount: listing.built.tagCount,
    widgetTagCount: listing.built.widgetTagCount,
    widgetTagFieldNames: listing.built.widgetTagFieldNames,
    schedule: listingSpot,
  },
  managed: {
    output: path.relative(root, managedPath),
    hasDocusealTags: managed.built.hasDocusealTags,
    tagCount: managed.built.tagCount,
    widgetTagCount: managed.built.widgetTagCount,
    widgetTagFieldNames: managed.built.widgetTagFieldNames,
    schedule: managedSpot,
  },
  flattenedDraftWidgetAnnots: countWidgets(filledDoc).widgets,
  blankTemplateWidgetAnnots: countWidgets(blank).widgets,
}

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
