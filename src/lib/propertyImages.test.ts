import { describe, expect, it } from 'vitest'
import {
  MAX_PROPERTY_IMAGE_DESCRIPTION_LENGTH,
  firstPropertyImageUrl,
  normalizePropertyImages,
  serializePropertyImages,
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
})
