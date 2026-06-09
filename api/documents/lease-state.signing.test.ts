/**
 * Lease-state signing URL gate: mirrors api/documents/lease-state.ts (only attach
 * signing_url when deriveLeaseDocState === 'ready_to_sign').
 */
import { describe, expect, it } from 'vitest'

import { deriveLeaseDocState } from '../../src/lib/leaseState.js'

function pickEmbedSrc(
  submitters: Array<{ role?: string; embed_src?: string }>,
  role: 'landlord' | 'tenant',
): string | null {
  const needle = role === 'landlord' ? 'landlord' : 'tenant'
  for (const s of submitters) {
    const r = typeof s.role === 'string' ? s.role.toLowerCase() : ''
    const src = typeof s.embed_src === 'string' && s.embed_src.trim() ? s.embed_src.trim() : null
    if (r.includes(needle) && src) return src
  }
  return null
}

function resolveLeaseStateSigningUrl(args: {
  bookingStatus: string
  documentStatus: string
  viewerRole: 'landlord' | 'tenant'
  docusealSubmitters: Array<{ role?: string; embed_src?: string }>
}): string | undefined {
  const state = deriveLeaseDocState({
    bookingStatus: args.bookingStatus,
    serviceTierFinal: 'listing',
    documentExists: true,
    documentStatus: args.documentStatus,
    landlordSignedAt: null,
    studentSignedAt: null,
    viewerRole: args.viewerRole,
  })
  if (state !== 'ready_to_sign') return undefined
  const url = pickEmbedSrc(args.docusealSubmitters, args.viewerRole)
  return url ?? undefined
}

const submitters = [
  { role: 'Landlord', embed_src: 'https://docuseal.example/sign/landlord' },
  { role: 'Tenant', embed_src: 'https://docuseal.example/sign/tenant' },
]

describe('lease-state signing_url gate', () => {
  it('returns no signing_url when booking is cancelled', () => {
    const url = resolveLeaseStateSigningUrl({
      bookingStatus: 'cancelled',
      documentStatus: 'sent_for_signing',
      viewerRole: 'tenant',
      docusealSubmitters: submitters,
    })
    expect(url).toBeUndefined()
  })

  it('returns signing_url for bond_pending booking with live DocuSeal session', () => {
    const url = resolveLeaseStateSigningUrl({
      bookingStatus: 'bond_pending',
      documentStatus: 'sent_for_signing',
      viewerRole: 'tenant',
      docusealSubmitters: submitters,
    })
    expect(url).toBe('https://docuseal.example/sign/tenant')
  })
})
