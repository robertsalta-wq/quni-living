import { describe, expect, it } from 'vitest'
import { listingPublicPath, listingShareText, listingShareUrl } from './listingShare'

describe('listingShare', () => {
  it('builds canonical public path', () => {
    expect(listingPublicPath('cosy-room-liverpool')).toBe('/listings/cosy-room-liverpool')
  })

  it('encodes slug segments', () => {
    expect(listingPublicPath('room & board')).toBe('/listings/room%20%26%20board')
  })

  it('combines title and subtitle for share text', () => {
    expect(listingShareText('Studio near campus', 'Liverpool · $350/wk')).toBe(
      'Studio near campus - Liverpool · $350/wk',
    )
  })

  it('builds absolute share URL from site base', () => {
    expect(listingShareUrl('abc')).toMatch(/\/listings\/abc$/)
  })
})
