/** Emoji for listing amenity chips (PropertyDetail amenities grid). */

export function listingAmenityIconForName(raw: string): string {
  const n = raw.trim().toLowerCase()
  if (/air\s*conditioning|^ac$/i.test(n)) return '❄️'
  if (/ceiling\s*fan/i.test(n)) return '🌬️'
  if (/bills?\s*included|^utilities$/i.test(n)) return '💡'
  if (/dishwasher/i.test(n)) return '🍽️'
  if (/dryer/i.test(n)) return '🧺'
  if (/garden/i.test(n)) return '🌿'
  if (/gym/i.test(n)) return '🏋️'
  if (/heat/i.test(n)) return '🔥'
  if (/balcony/i.test(n)) return '🪟'
  if (/linen/i.test(n)) return '🛏️'
  if (/clean|housekeeping|house\s*keeper|mop|maid/i.test(n)) return '🧹'
  if (/transport|train|bus|tram|ferry/i.test(n)) return '🚌'
  if (/parking|car\s*space|car\s*park|garage/i.test(n)) return '🚗'
  if (/pet/i.test(n)) return '🐾'
  if (/desk|study/i.test(n)) return '📚'
  if (/pool|swim/i.test(n)) return '🏊'
  if (/wifi|wi-?fi|internet|broadband/i.test(n)) return '📶'
  if (/wash|laundry|machine/i.test(n)) return '🫧'
  if (/furnish/i.test(n)) return '🛋️'
  return '✓'
}
