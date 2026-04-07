import dotenv from 'dotenv'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { Document, Page, Text, pdf } from '@react-pdf/renderer'
import { createDocusealSubmissionFromPdf } from '../api/lib/docuseal.shared.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvLocal() {
  const envPath = path.join(root, '.env.local')
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing .env.local at ${envPath}`)
  }
  dotenv.config({ path: envPath })
}

async function buildTestPdfBase64() {
  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: 'A4', style: { padding: 48 } },
      React.createElement(Text, { style: { fontSize: 24 } }, 'Test Document'),
    ),
  )

  const out = await pdf(doc).toBuffer()
  const chunks = []
  for await (const chunk of out) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('base64')
}

function pickSigningUrls(submission) {
  const submitters = Array.isArray(submission?.submitters) ? submission.submitters : []
  const byRole = (needle) =>
    submitters.find((s) => String(s?.role || '').toLowerCase().includes(needle))?.embed_src || ''

  const landlordUrl = byRole('landlord') || submitters[0]?.embed_src || ''
  const tenantUrl = byRole('tenant') || submitters[1]?.embed_src || ''

  return { landlordUrl, tenantUrl }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function withRetries(fn, opts = {}) {
  const retries = Number.isFinite(opts.retries) ? opts.retries : 2
  const baseDelayMs = Number.isFinite(opts.baseDelayMs) ? opts.baseDelayMs : 1000
  let lastErr = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastErr = err
      if (attempt >= retries) break
      const delay = baseDelayMs * Math.pow(2, attempt)
      console.warn(`[DocuSeal test] attempt ${attempt + 1} failed, retrying in ${delay}ms`)
      await sleep(delay)
    }
  }

  throw lastErr
}

async function main() {
  loadEnvLocal()

  const pdfBase64 = await buildTestPdfBase64()

  const submission = await withRetries(
    () =>
      createDocusealSubmissionFromPdf({
        name: 'Test Document',
        pdfBase64,
        landlord: { name: 'Test Landlord', email: 'hello@quni.com.au' },
        tenant: { name: 'Test Tenant', email: 'hello@quni.com.au' },
      }),
    { retries: 2, baseDelayMs: 1250 },
  )

  console.log('DocuSeal response:')
  console.log(JSON.stringify(submission, null, 2))

  const submissionId = submission?.id != null ? String(submission.id) : null
  if (!submissionId) {
    throw new Error('DocuSeal response missing submission id')
  }

  const { landlordUrl, tenantUrl } = pickSigningUrls(submission)
  console.log('---')
  console.log('Submission ID:', submissionId)
  console.log('Landlord signing URL:', landlordUrl || '(missing)')
  console.log('Tenant signing URL:', tenantUrl || '(missing)')
}

main().catch((err) => {
  console.error('DocuSeal test failed.')
  console.error(err)
  // Avoid forcing an immediate exit while native handles are still unwinding.
  process.exitCode = 1
})

