import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { createDocusealSubmissionFromPdf } from './docuseal.shared.js'

async function pdfBase64(): Promise<string> {
  const doc = await PDFDocument.create()
  doc.addPage()
  return Buffer.from(await doc.save()).toString('base64')
}

describe('createDocusealSubmissionFromPdf send_email', () => {
  beforeEach(() => {
    process.env.DOCUSEAL_API_URL = 'https://docuseal.example'
    process.env.DOCUSEAL_API_TOKEN = 'token'
    delete process.env.DOCUSEAL_SEND_EMAIL
  })

  it('sets send_email false on the submission and every submitter by default', async () => {
    const fetchMock = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({ id: 1, submitters: [] }),
      } as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    await createDocusealSubmissionFromPdf({
      name: 'NSW agreement',
      pdfBase64: await pdfBase64(),
      landlord: { name: 'Quinn', email: 'quinn@example.com' },
      tenant: { name: 'Robert', email: 'rob@example.com' },
      coTenant: { name: 'Sam', email: 'sam@example.com' },
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(body.send_email).toBe(false)
    expect(body.bcc_completed).toBeUndefined()
    expect(body.send_completed_email).toBeUndefined()
    expect(body.submitters).toHaveLength(3)
    expect(body.submitters.every((submitter: { send_email: boolean }) => submitter.send_email === false)).toBe(true)

    vi.unstubAllGlobals()
  })

  it('keeps send_email true on each submitter when the caller asks DocuSeal to invite', async () => {
    const fetchMock = vi.fn(async () => {
      return { ok: true, json: async () => ({ id: 2, submitters: [] }) } as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    await createDocusealSubmissionFromPdf({
      name: 'Corrected addendum',
      pdfBase64: await pdfBase64(),
      sendEmail: true,
      landlord: { name: 'Quinn', email: 'quinn@example.com' },
      tenant: { name: 'Robert', email: 'rob@example.com' },
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(body.send_email).toBe(true)
    expect(body.submitters.map((submitter: { send_email: boolean }) => submitter.send_email)).toEqual([true, true])

    vi.unstubAllGlobals()
  })
})
