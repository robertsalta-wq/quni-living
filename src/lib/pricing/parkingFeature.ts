/** Match amenities catalogue row for carpark (synced with `parking_available` on save). */
export function findParkingFeatureId(features: { id: string; name: string }[]): string | null {
  const exact = features.find((f) => /^parking$/i.test(f.name.trim()))
  if (exact) return exact.id
  return features.find((f) => /\bparking\b/i.test(f.name))?.id ?? null
}
