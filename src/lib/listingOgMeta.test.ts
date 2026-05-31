import { describe, expect, it } from 'vitest'
import { buildListingOgHtml, escapeHtml } from '../../api/lib/listingOgMeta.js'
import { isSocialCrawler } from '../../api/lib/socialCrawler.js'

describe('isSocialCrawler', () => {
  it('detects WhatsApp and Facebook crawlers', () => {
    expect(isSocialCrawler('WhatsApp/2.23.20.0')).toBe(true)
    expect(isSocialCrawler('facebookexternalhit/1.1')).toBe(true)
  })

  it('ignores normal browsers', () => {
    expect(
      isSocialCrawler(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toBe(false)
  })
})

describe('buildListingOgHtml', () => {
  it('escapes meta content and includes listing image', () => {
    const html = buildListingOgHtml({
      title: 'Cosy room',
      fullTitle: 'Cosy room | Quni Living',
      description: 'A "nice" room near campus.',
      image: 'https://cdn.example.com/photo.jpg',
      imageAlt: 'Cosy room',
      canonicalPath: '/listings/cosy-room',
      canonicalUrl: 'https://quni-living.vercel.app/listings/cosy-room',
    })

    expect(html).toContain('property="og:image" content="https://cdn.example.com/photo.jpg"')
    expect(html).toContain('property="og:url" content="https://quni-living.vercel.app/listings/cosy-room"')
    expect(html).toContain(escapeHtml('A "nice" room near campus.'))
  })
})
