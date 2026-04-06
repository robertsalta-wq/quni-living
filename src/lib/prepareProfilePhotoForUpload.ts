function safeExtFromFilename(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  return ext && /^[a-z0-9]+$/i.test(ext) ? ext : 'jpg'
}

async function loadImageBitmapFromFile(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file)
  } catch {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        createImageBitmap(img).then(resolve).catch(reject)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Could not load image'))
      }
      img.src = url
    })
  }
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not encode image'))),
      'image/jpeg',
      quality,
    )
  })
}

async function compressRasterImageToMaxBytes(file: File, maxBytes: number): Promise<Blob> {
  const bitmap = await loadImageBitmapFromFile(file)
  try {
    let maxSide = Math.min(2048, Math.max(bitmap.width, bitmap.height))
    let quality = 0.92
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not prepare image')

    for (let iter = 0; iter < 48; iter++) {
      const longEdge = Math.max(bitmap.width, bitmap.height)
      const scale = maxSide / longEdge
      const w = Math.max(1, Math.round(bitmap.width * scale))
      const h = Math.max(1, Math.round(bitmap.height * scale))
      canvas.width = w
      canvas.height = h
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(bitmap, 0, 0, w, h)
      const blob = await canvasToJpegBlob(canvas, quality)
      if (blob.size <= maxBytes) return blob

      if (quality > 0.5) {
        quality -= 0.07
      } else if (maxSide > 480) {
        maxSide = Math.round(maxSide * 0.82)
        quality = 0.88
      } else {
        throw new Error('Photo is still too large after compression. Try a different image.')
      }
    }
    throw new Error('Photo is still too large after compression. Try a different image.')
  } finally {
    bitmap.close()
  }
}

/**
 * Ensures a profile photo fits within `maxBytes` by resizing and JPEG compression in the browser
 * when the original file is too large. Smaller files are returned unchanged.
 */
export async function prepareProfilePhotoForUpload(
  file: File,
  maxBytes: number,
): Promise<{ blob: Blob; contentType: string; ext: string }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size <= maxBytes) {
    return {
      blob: file,
      contentType: file.type,
      ext: safeExtFromFilename(file.name),
    }
  }
  const blob = await compressRasterImageToMaxBytes(file, maxBytes)
  return { blob, contentType: 'image/jpeg', ext: 'jpg' }
}
