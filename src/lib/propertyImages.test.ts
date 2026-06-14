import { describe, expect, it } from 'vitest'
import {
  MAX_PROPERTY_IMAGE_DESCRIPTION_LENGTH,
  filterPropertyImagesExcludingUrls,
  firstPropertyImageUrl,
  normalizePropertyImages,
  pathFromPropertyImageUrl,
  serializePropertyImages,
  urlsToRemoveFromPropertyImageSave,
} from './propertyImages'

describe('propertyImages', () => {
  it('parses plain URL entries', () => {
    expect(normalizePropertyImages(['https://cdn.example/a.jpg', ''])).toEqual([
      { url: 'https://cdn.example/a.jpg' },
    ])
  })

  it('parses JSON entries with descriptions', () => {
    const raw = [JSON.stringify({ url: 'https://cdn.example/b.jpg', description: 'Kitchen' })]
    expect(normalizePropertyImages(raw)).toEqual([
      { url: 'https://cdn.example/b.jpg', description: 'Kitchen' },
    ])
  })

  it('serializes with caption only when present', () => {
    expect(
      serializePropertyImages([
        { url: 'https://a', description: 'Bedroom' },
        { url: 'https://b' },
      ]),
    ).toEqual([JSON.stringify({ url: 'https://a', description: 'Bedroom' }), 'https://b'])
  })

  it('round-trips through serialize and normalize', () => {
    const images = [
      { url: 'https://x/1.jpg', description: 'Lounge' },
      { url: 'https://x/2.jpg' },
    ]
    expect(normalizePropertyImages(serializePropertyImages(images))).toEqual(images)
  })

  it('truncates overlong descriptions on parse', () => {
    const long = 'x'.repeat(MAX_PROPERTY_IMAGE_DESCRIPTION_LENGTH + 50)
    const raw = [JSON.stringify({ url: 'https://a', description: long })]
    expect(normalizePropertyImages(raw)[0]?.description?.length).toBe(MAX_PROPERTY_IMAGE_DESCRIPTION_LENGTH)
  })

  it('firstPropertyImageUrl returns first valid URL', () => {
    expect(firstPropertyImageUrl([JSON.stringify({ url: 'https://first', description: 'Cover' })])).toBe(
      'https://first',
    )
  })

  it('pathFromPropertyImageUrl extracts storage path', () => {
    expect(
      pathFromPropertyImageUrl(
        'https://proj.supabase.co/storage/v1/object/public/property-images/user-1/photo.jpg',
      ),
    ).toBe('user-1/photo.jpg')
  })

  it('urlsToRemoveFromPropertyImageSave finds dropped and orphaned uploads', () => {
    const atLoad = [{ url: 'https://a/1.jpg' }, { url: 'https://a/2.jpg' }]
    const saved = [{ url: 'https://a/2.jpg' }, { url: 'https://a/3.jpg' }]
    const uploaded = new Set(['https://a/3.jpg', 'https://a/4.jpg'])
    expect(urlsToRemoveFromPropertyImageSave(atLoad, saved, uploaded).sort()).toEqual([
      'https://a/1.jpg',
      'https://a/4.jpg',
    ])
  })

  it('filterPropertyImagesExcludingUrls removes broken URLs', () => {
    const images = [{ url: 'https://a/1.jpg' }, { url: 'https://a/2.jpg' }]
    expect(filterPropertyImagesExcludingUrls(images, new Set(['https://a/1.jpg']))).toEqual([
      { url: 'https://a/2.jpg' },
    ])
  })
})
