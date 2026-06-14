import { useCallback, useEffect, useMemo, useState } from 'react'
import { normalizePropertyImages } from '../lib/propertyImages'

/** First loadable cover URL; advances when the browser reports a broken image. */
export function useListingCoverImage(images: string[] | null | undefined): {
  coverUrl: string | null
  onCoverError: () => void
} {
  const candidates = useMemo(
    () => normalizePropertyImages(images).map((image) => image.url),
    [images],
  )
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [candidates])

  const onCoverError = useCallback(() => {
    setIndex((current) => (current + 1 < candidates.length ? current + 1 : current))
  }, [candidates.length])

  return {
    coverUrl: candidates[index] ?? null,
    onCoverError,
  }
}
