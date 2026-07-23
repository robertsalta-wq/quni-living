/**
 * NSW FT6600 + addendum burn-in dry run — disposable DocuSeal submission.
 *
 * Proves executed PDF output (not tag presence): signatures, dates, addendum sizing.
 * - Both parties: explicit three-field dates (6 / July / 26) on every execution row they own
 * - Test signature image on every signature field
 *
 * Run: node scripts/run-with-env.mjs npx tsx scripts/nsw-ft6600-execution-dry-run.mjs
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { createCanvas } from 'canvas'
import { PDFParse } from 'pdf-parse'

globalThis.React = React

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const spikeDir = path.join(root, 'scripts', 'test-official-form-spike')

const FAKE_LANDLORD = {
  name: 'Spike Landlord Dryrun',
  email: 'spike.nsw.ft6600.landlord.dryrun@example.com',
}
const FAKE_TENANT = {
  name: 'Spike Tenant Dryrun',
  email: 'spike.nsw.ft6600.tenant.dryrun@example.com',
}

const EXPLICIT_AU_DATE = '06/07/2026'
const SPIKE_DATE_COMPONENTS = { day: '6', month: 'July', year: '26' }
const SPIKE_EMAIL_PREFIX = 'spike.nsw.ft6600'

const { buildNswResidentialTenancyAgreementPropsFromBooking } = await import(
  '../api/lib/documents/buildNswFt6600AgreementProps.ts'
)
const { QUINN_ROBERT_FT6600_LISTING_INPUT } = await import(
  '../api/lib/documents/quinnRobertFt6600Fixture.ts'
)
const { OFFICIAL_FT6600_SPIKE_DATE_COMPONENT_VALUES } = await import(
  '../api/lib/documents/officialNswFt6600Signing.ts'
)
const { buildOfficialNswFt6600PdfWithSigning } = await import(
  '../api/lib/documents/officialNswFt6600Signing.ts'
)
const { createDocusealSubmissionFromPdf, getDocusealApiBase, getDocusealAuthHeaders } = await import(
  '../api/lib/docuseal.shared.js'
)

const SPIKE_DATE = OFFICIAL_FT6600_SPIKE_DATE_COMPONENT_VALUES
const { renderToBuffer } = await import('@react-pdf/renderer')
const { QuniPlatformAddendum } = await import('../src/lib/documents/QuniPlatformAddendum.tsx')

function buildTestSignatureDataUri() {
  const w = 400
  const h = 143
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#1e3a5f'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(15, 70)
  ctx.bezierCurveTo(60, 15, 100, 85, 150, 45)
  ctx.bezierCurveTo(200, 10, 260, 80, 370, 50)
  ctx.stroke()
  ctx.font = 'bold 22px Helvetica'
  ctx.fillStyle = '#111827'
  ctx.fillText('Spike Test', 15, 35)
  return `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`
}

function buildAddendumPropsFromRta(rtaProps) {
  return {
    documentId: rtaProps.documentId,
    generatedAt: rtaProps.generatedAt,
    landlord: rtaProps.landlord,
    tenant: rtaProps.tenant,
    premises: rtaProps.premises,
    term: rtaProps.term,
    rent: rtaProps.rent,
    bond: rtaProps.bond,
    utilitiesDescription:
      'Electricity, gas, water, internet and waste services as agreed between the parties and as described on the property listing where applicable.',
    signingPackage: 'residential_tenancy',
    serviceTier: 'managed',
    allInclusive: true,
    billsIncluded: true,
    rentPaymentMethod: 'bank_transfer',
    bankDetails: {
      bsb: '939200',
      accountNumber: '823175945',
      accountName: 'SPIKE DRYRUN PTY LTD',
      bankName: 'Bank',
    },
    emergencyContact: '-',
    rentEnquiriesEmail: 'noreply-spike.quni.test@example.com',
    generalEnquiriesEmail: 'noreply-spike.quni.test@example.com',
    houseCommunicationsChannel: 'Property WhatsApp group (house-related only)',
    utilitiesCap: 0,
    houseRules: null,
    additionalTenantNames: rtaProps.additionalTenantNames ?? [],
  }
}

function checkPdftoppmInScriptEnv() {
  try {
    const stderr = execSync('pdftoppm -v', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const stdout = ''
    const combined = `${stderr}${stdout}`.trim()
    return { available: true, versionLine: combined.split('\n')[0] || combined }
  } catch (e) {
    const stderr = e?.stderr?.toString?.() || ''
    const stdout = e?.stdout?.toString?.() || ''
    const combined = `${stderr}${stdout}`.trim()
    if (/pdftoppm/i.test(combined)) {
      return { available: true, versionLine: combined.split('\n')[0] || combined }
    }
    return {
      available: false,
      reason: e instanceof Error ? e.message : String(e),
      combined: combined.slice(0, 200),
    }
  }
}

async function fetchWithRetry(url, init = {}, attempts = 6) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res
    } catch (e) {
      lastErr = e
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

async function docusealFetch(apiPath, init = {}) {
  const base = getDocusealApiBase()
  if (!base) throw new Error('DOCUSEAL_API_URL not configured')
  const res = await fetchWithRetry(`${base}${apiPath}`, {
    ...init,
    headers: {
      ...getDocusealAuthHeaders({ includeContentType: init.body != null }),
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    const err = new Error(
      `DocuSeal ${init.method ?? 'GET'} ${apiPath} failed: ${res.status} ${text.slice(0, 800)}`,
    )
    err.status = res.status
    err.body = text
    throw err
  }
  return res
}

async function docusealJson(apiPath, init = {}) {
  const res = await docusealFetch(apiPath, init)
  return res.json()
}

async function cleanupOrphanSpikeSubmissions() {
  const archived = []
  const errors = []
  let after = null
  for (let page = 0; page < 5; page++) {
    const q = new URLSearchParams({ q: SPIKE_EMAIL_PREFIX, limit: '100' })
    if (after != null) q.set('after', String(after))
    let body
    try {
      body = await docusealJson(`/api/submitters?${q}`)
    } catch (e) {
      errors.push({ step: 'list_submitters', message: e instanceof Error ? e.message : String(e) })
      break
    }
    const rows = Array.isArray(body.data) ? body.data : []
    if (!rows.length) break
    const submissionIds = [
      ...new Set(
        rows
          .filter((s) => typeof s.email === 'string' && s.email.includes(SPIKE_EMAIL_PREFIX))
          .map((s) => s.submission_id)
          .filter((id) => typeof id === 'number'),
      ),
    ]
    for (const submissionId of submissionIds) {
      try {
        await docusealFetch(`/api/submissions/${submissionId}`, { method: 'DELETE' })
        archived.push(submissionId)
      } catch (e) {
        errors.push({
          submissionId,
          message: e instanceof Error ? e.message : String(e),
          body: e.body?.slice?.(0, 400),
        })
      }
    }
    after = body.pagination?.next ?? null
    if (!after) break
  }
  return { archived: [...new Set(archived)], errors }
}

function fieldsForSubmitterFromCreateResponse(createResponse, submitterUuid) {
  const all = Array.isArray(createResponse.fields) ? createResponse.fields : []
  return all.filter((f) => f.submitter_uuid === submitterUuid)
}

const TYPED_TEST_SIGNATURE = 'Spike Test Sig'

function spikeDateComponentValue(fieldName) {
  const n = fieldName.toLowerCase()
  if (n.includes('month')) return SPIKE_DATE.month
  if (n.includes('year')) return SPIKE_DATE.year
  if (n.includes('day')) return SPIKE_DATE.day
  return null
}

function buildCompletionPayload(fields, { signatureDataUri, explicitDateComponents }) {
  const payloadFields = []
  for (const f of fields) {
    const type = (f.type || '').toLowerCase()
    const name = f.name
    if (!name) continue
    if (type === 'signature' || type === 'initials') {
      payloadFields.push({ name, default_value: signatureDataUri, readonly: true })
    } else if (explicitDateComponents && (type === 'text' || type === 'date')) {
      if (type === 'date' && /addendum/i.test(name)) {
        payloadFields.push({ name, default_value: EXPLICIT_AU_DATE, readonly: true })
        continue
      }
      const componentValue = spikeDateComponentValue(name)
      if (componentValue != null) {
        payloadFields.push({ name, default_value: componentValue, readonly: true })
      }
    }
  }
  return { fields: payloadFields, completed: true }
}

async function completeSubmitterWithBurnIn(submitterId, submitterUuid, role, createResponse, options) {
  const getSubmitter = await docusealJson(`/api/submitters/${submitterId}`)
  const fields = fieldsForSubmitterFromCreateResponse(createResponse, submitterUuid)
  const discovered = fields.map((f) => ({ name: f.name, type: f.type, required: f.required }))
  if (!fields.length) {
    throw new Error(
      `No fields for submitter ${submitterId} (${role}) uuid=${submitterUuid}. POST create returned ${createResponse.fields?.length ?? 0} fields; GET submitter template=${getSubmitter.template?.id ?? 'null'}`,
    )
  }
  const body = buildCompletionPayload(fields, options)
  let putResponse
  try {
    putResponse = await docusealJson(`/api/submitters/${submitterId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  } catch (e) {
    const detail = {
      submitterId,
      role,
      getSubmitter: { id: getSubmitter.id, role: getSubmitter.role, status: getSubmitter.status },
      discoveredFields: discovered,
      requestBody: {
        ...body,
        fields: body.fields.map((f) => ({
          ...f,
          default_value:
            typeof f.default_value === 'string' && f.default_value.startsWith('data:image')
              ? `data:image/png;base64,<${f.default_value.length} chars>`
              : f.default_value,
        })),
      },
      apiStatus: e.status,
      apiBody: e.body?.slice?.(0, 1200) ?? (e instanceof Error ? e.message : String(e)),
    }
    throw new Error(`PUT submitter failed: ${JSON.stringify(detail, null, 2)}`)
  }
  return {
    submitterId,
    role,
    getSubmitter: { id: getSubmitter.id, role: getSubmitter.role, status: getSubmitter.status },
    discoveredFields: discovered,
    dateStrategy: options.explicitDateComponents
      ? `three-field ${SPIKE_DATE.day}/${SPIKE_DATE.month}/${SPIKE_DATE.year}`
      : 'omitted',
    fieldsSubmitted: body.fields.map((f) => ({
      name: f.name,
      type: discovered.find((d) => d.name === f.name)?.type,
    })),
    putStatus: putResponse?.status ?? 'completed',
    valuesAfterPut: putResponse?.values ?? null,
  }
}

async function waitForCompletedSubmission(submissionId, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const body = await docusealJson(`/api/submissions/${submissionId}`)
    if (body.combined_document_url) return body
    try {
      const docsBody = await docusealJson(`/api/submissions/${submissionId}/documents?merge=true`)
      const merged = docsBody.documents?.[0]?.url
      if (merged) return { ...body, combined_document_url: merged }
    } catch {
      /* not ready */
    }
    if (body.status === 'completed' && body.completed_at && i >= maxAttempts - 3) {
      throw new Error(
        `Submission ${submissionId} completed but no document URL. Last body: ${JSON.stringify({
          status: body.status,
          completed_at: body.completed_at,
        })}`,
      )
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error(`Timed out waiting for submission ${submissionId} documents`)
}

function rasterisePages(pdfPath, outPrefix, fromPage, toPage, pdftoppmCheck, dpi = 300) {
  if (!pdftoppmCheck.available) {
    return { skipped: true, reason: 'pdftoppm not available in script environment' }
  }
  try {
    execSync(`pdftoppm -png -r ${dpi} -f ${fromPage} -l ${toPage} "${pdfPath}" "${outPrefix}"`, {
      stdio: 'pipe',
    })
    const pngs = []
    for (let p = fromPage; p <= toPage; p++) {
      for (const c of [`${outPrefix}-${p}.png`, `${outPrefix}-${String(p).padStart(2, '0')}.png`]) {
        if (fs.existsSync(c) && !pngs.includes(c)) pngs.push(c)
      }
    }
    return pngs.length ? pngs : { skipped: true, reason: 'pdftoppm ran but no PNG output files found' }
  } catch (e) {
    return { skipped: true, reason: e instanceof Error ? e.message : String(e) }
  }
}

function extractDateTokens(text) {
  const tokens = text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g) || []
  return [...new Set(tokens)]
}

async function scanPdfText(buf, label) {
  const parser = new PDFParse({ data: buf })
  const text = (await parser.getText()).text || ''
  await parser.destroy()
  const pages = text.split(/\n-- \d+ of \d+ --\n/)
  const page17 = pages.find((p) => p.includes('SIGNED BY THE LANDLORD')) ?? ''
  const page18 = pages.find((p) => p.includes('TENANT INFORMATION STATEMENT')) ?? ''
  const addendum = pages.find((p) => p.includes('17 Execution')) ?? text.slice(-1200)
  return {
    label,
    curlyCount: (text.match(/\{\{/g) || []).length,
    hasDocumentId: /Document ID:/i.test(text),
    dateTokens: extractDateTokens(text),
    page17Dates: extractDateTokens(page17),
    page18Dates: extractDateTokens(page18),
    addendumDates: extractDateTokens(addendum),
    page17Sample: page17.slice(0, 700),
    page18Sample: page18.slice(0, 700),
    addendumSample: addendum.slice(0, 700),
  }
}

// --- main ---
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
fs.mkdirSync(spikeDir, { recursive: true })

const pdftoppmCheck = checkPdftoppmInScriptEnv()
const signatureDataUri = buildTestSignatureDataUri()

const rtaProps = buildNswResidentialTenancyAgreementPropsFromBooking(QUINN_ROBERT_FT6600_LISTING_INPUT)
const built = await buildOfficialNswFt6600PdfWithSigning(rtaProps, { includeCoTenantSignatureTags: false })
const addendumProps = buildAddendumPropsFromRta(rtaProps)
const addendumBuffer = await renderToBuffer(React.createElement(QuniPlatformAddendum, addendumProps))

const rtaBase64 = Buffer.from(built.pdfBytes).toString('base64')
const addendumBase64 = Buffer.from(addendumBuffer).toString('base64')

const sourcePath = path.join(spikeDir, `nsw-ft6600-dryrun-source-${stamp}.pdf`)
fs.writeFileSync(sourcePath, built.pdfBytes)

const submission = await createDocusealSubmissionFromPdf({
  name: `NSW FT6600 burn-in dry run ${stamp}`,
  documents: [
    { name: 'NSW Residential Tenancy Agreement.pdf', file: rtaBase64 },
    { name: 'Quni Platform Addendum.pdf', file: addendumBase64 },
  ],
  landlord: FAKE_LANDLORD,
  tenant: FAKE_TENANT,
  submitterSignReason: false,
})

const submissionId = submission.id
if (!submissionId) throw new Error('DocuSeal response missing submission id')

// Persist parsed fields immediately — only available on POST create, not GET.
const fieldsSnapshotPath = path.join(spikeDir, `nsw-ft6600-dryrun-fields-${stamp}.json`)
fs.writeFileSync(
  fieldsSnapshotPath,
  JSON.stringify({ submissionId, fields: submission.fields ?? [], submitters: submission.submitters ?? [] }, null, 2),
)

const submitters = Array.isArray(submission.submitters) ? submission.submitters : []
const landlordSubmitter = submitters.find((s) => s.role === 'First Party')
const tenantSubmitter = submitters.find((s) => s.role === 'Second Party')
if (!landlordSubmitter?.id || !tenantSubmitter?.id) {
  throw new Error(
    `Expected First Party + Second Party submitters; got: ${JSON.stringify(submitters.map((s) => ({ id: s.id, role: s.role })))}`,
  )
}

const completionLog = []
completionLog.push(
  await completeSubmitterWithBurnIn(
    landlordSubmitter.id,
    landlordSubmitter.uuid,
    'First Party',
    submission,
    { signatureDataUri, explicitDateComponents: true },
  ),
)
await new Promise((r) => setTimeout(r, 2000))
completionLog.push(
  await completeSubmitterWithBurnIn(
    tenantSubmitter.id,
    tenantSubmitter.uuid,
    'Second Party',
    submission,
    { signatureDataUri, explicitDateComponents: true },
  ),
)

const completed = await waitForCompletedSubmission(submissionId)
const combinedUrl = completed.combined_document_url
if (!combinedUrl) throw new Error('Missing combined_document_url after completion')

const pdfRes = await fetchWithRetry(combinedUrl)
const executedBytes = Buffer.from(await pdfRes.arrayBuffer())
const executedPath = path.join(spikeDir, `nsw-ft6600-dryrun-executed-${stamp}.pdf`)
fs.writeFileSync(executedPath, executedBytes)

const sourceScan = await scanPdfText(built.pdfBytes, 'source-ft6600')
const executedScan = await scanPdfText(executedBytes, 'executed-combined')

const rasterPrefix = path.join(spikeDir, `nsw-ft6600-dryrun-p${stamp}`)
const ft6600Rasters = rasterisePages(executedPath, `${rasterPrefix}-ft6600-p`, 17, 18, pdftoppmCheck)

let addendumLastPage = 26
try {
  const parser = new PDFParse({ data: executedBytes })
  const info = await parser.getInfo()
  await parser.destroy()
  if (info?.total) addendumLastPage = info.total
} catch {
  /* default */
}
const addendumRaster = rasterisePages(
  executedPath,
  `${rasterPrefix}-addendum-p`,
  addendumLastPage,
  addendumLastPage,
  pdftoppmCheck,
)

let archiveOutcome = 'pending'
try {
  const delRes = await docusealFetch(`/api/submissions/${submissionId}`, { method: 'DELETE' })
  archiveOutcome = delRes.status === 204 || delRes.ok ? 'archived' : `status-${delRes.status}`
} catch (e) {
  archiveOutcome = e instanceof Error ? e.message : String(e)
}

let orphanCleanup = { archived: [], errors: [], skipped: 'deferred' }
try {
  orphanCleanup = await cleanupOrphanSpikeSubmissions()
} catch (e) {
  orphanCleanup = { archived: [], errors: [{ message: e instanceof Error ? e.message : String(e) }] }
}

let pymupdfAssertion = { skipped: true, reason: 'not run' }
try {
  const assertScript = path.join(root, 'scripts', 'assert-ft6600-execution-pdf.py')
  const raw = execSync(`python "${assertScript}" "${executedPath}" "${fieldsSnapshotPath}"`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const jsonStart = raw.indexOf('{')
  pymupdfAssertion = JSON.parse(jsonStart >= 0 ? raw.slice(jsonStart) : raw)
} catch (e) {
  const stdout = e?.stdout?.toString?.() || ''
  const stderr = e?.stderr?.toString?.() || ''
  try {
    pymupdfAssertion = stdout.trim() ? JSON.parse(stdout) : { passed: false, error: stderr || e.message }
  } catch {
    pymupdfAssertion = {
      passed: false,
      error: e instanceof Error ? e.message : String(e),
      stdout: stdout.slice(0, 2000),
      stderr: stderr.slice(0, 2000),
    }
  }
}

const explicitDateSeen = executedScan.dateTokens.includes(EXPLICIT_AU_DATE)
const usAmbiguousDate = executedScan.dateTokens.includes('07/06/2026')

const report = {
  ranAt: new Date().toISOString(),
  submissionId,
  fakeSigners: { landlord: FAKE_LANDLORD, tenant: FAKE_TENANT },
  pdftoppmCheck,
  orphanCleanup,
  completionLog,
  pymupdfAssertion,
  spikeDateComponents: SPIKE_DATE,
  built: {
    hasDocusealTags: built.hasDocusealTags,
    tagCount: built.tagCount,
    widgetTagFieldNames: built.widgetTagFieldNames,
  },
  parsedFieldCount: submission.fields?.length ?? 0,
  parsedFields: (submission.fields ?? []).map((f) => ({
    name: f.name,
    type: f.type,
    roleUuid: f.submitter_uuid,
  })),
  sourceScan,
  executedScan,
  dateVerification: {
    threeFieldComponents: {
      strategy: `Both parties passed ${SPIKE_DATE.day} / ${SPIKE_DATE.month} / ${SPIKE_DATE.year} on text fields`,
      pymupdfPassed: pymupdfAssertion.passed === true,
      pymupdfDateDrawnBoxRows: pymupdfAssertion.assertions?.date_drawn_box_containment?.rows ?? null,
      pymupdfAddendumDates: pymupdfAssertion.assertions?.addendum_dates ?? null,
    },
    legacySlashDates: {
      foundTokens: executedScan.dateTokens,
      usFormat07_06_2026: usAmbiguousDate,
    },
  },
  paths: {
    sourcePath: path.relative(root, sourcePath),
    fieldsSnapshotPath: path.relative(root, fieldsSnapshotPath),
    executedPath: path.relative(root, executedPath),
    ft6600Rasters: Array.isArray(ft6600Rasters) ? ft6600Rasters.map((p) => path.relative(root, p)) : ft6600Rasters,
    addendumRaster: Array.isArray(addendumRaster) ? addendumRaster.map((p) => path.relative(root, p)) : addendumRaster,
  },
  archiveOutcome,
  pixelGate: {
    executionNames: 'raster p17 — printed names from fill',
    ft6600Signatures: `raster p17–18 @300dpi — equal ~${32.4}pt signature heights`,
    ft6600Dates: `raster p17–18 — ${SPIKE_DATE.day} / ${SPIKE_DATE.month} / ${SPIKE_DATE.year} in day/month/year boxes`,
    stampContainment: 'PyMuPDF — no audit text in day-box rects on landlord/tenant rows',
    pymupdfAssertion: pymupdfAssertion.passed === true ? 'PASS' : 'FAIL',
  },
}

const reportPath = path.join(spikeDir, `nsw-ft6600-dryrun-report-${stamp}.json`)
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
