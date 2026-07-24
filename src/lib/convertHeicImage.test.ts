import { describe, expect, it } from 'vitest'
import { fileLooksLikeHeic, isHeicImage } from './convertHeicImage'

function ftypBytes(brand: string): Uint8Array {
  const buf = new Uint8Array(12)
  buf[0] = 0
  buf[1] = 0
  buf[2] = 0
  buf[3] = 0x18
  buf[4] = 'f'.charCodeAt(0)
  buf[5] = 't'.charCodeAt(0)
  buf[6] = 'y'.charCodeAt(0)
  buf[7] = 'p'.charCodeAt(0)
  for (let i = 0; i < 4; i++) buf[8 + i] = brand.charCodeAt(i)
  return buf
}

describe('isHeicImage', () => {
  it('detects by MIME and extension', () => {
    expect(isHeicImage(new File([new Uint8Array([1])], 'a.jpg', { type: 'image/heic' }))).toBe(true)
    expect(isHeicImage(new File([new Uint8Array([1])], 'a.heic', { type: '' }))).toBe(true)
    expect(isHeicImage(new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' }))).toBe(false)
  })
})

describe('fileLooksLikeHeic', () => {
  it('sniffs ftyp brand when MIME/extension look like JPEG', async () => {
    const file = new File([ftypBytes('heic')], 'IMG_001.jpg', { type: 'image/jpeg' })
    expect(await fileLooksLikeHeic(file)).toBe(true)
  })

  it('returns false for non-HEIC bytes', async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'a.jpg', { type: 'image/jpeg' })
    expect(await fileLooksLikeHeic(file)).toBe(false)
  })
})
