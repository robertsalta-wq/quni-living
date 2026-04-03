/**
 * Format property rows for the student_renter chat system prompt (facts-only).
 */
export function buildStudentListingContextBlock(props: Array<Record<string, unknown>>): string {
  const blocks: string[] = []

  for (const p of props) {
    const getStr = (k: string) => (typeof p[k] === 'string' ? p[k].trim() : '')
    const getBool = (k: string) => (typeof p[k] === 'boolean' ? (p[k] ? 'yes' : 'no') : '')

    const id = getStr('id')
    const title = getStr('title')
    const slug = getStr('slug')
    const roomType = getStr('room_type')
    const suburb = getStr('suburb')
    const state = getStr('state')
    const furnished = getBool('furnished')
    const linenSupplied = getBool('linen_supplied')
    const weeklyCleaningService = getBool('weekly_cleaning_service')

    const beds = p['bedrooms']
    const baths = p['bathrooms']
    const bond = p['bond']
    const leaseLength = getStr('lease_length')
    const availableFrom = getStr('available_from')
    const featured = getBool('featured')
    const rentPerWeek = p['rent_per_week']
    const createdAt = getStr('created_at')
    const distanceToCampusKm = p['distance_to_campus_km']

    const universities = p['universities']
    const uniNames = (() => {
      if (!universities || typeof universities !== 'object') return null
      if (Array.isArray(universities)) {
        const out = universities
          .map((u) => {
            if (!u || typeof u !== 'object') return ''
            const name = (u as { name?: unknown }).name
            return typeof name === 'string' ? name.trim() : ''
          })
          .filter(Boolean)
        return out.length ? out : null
      }
      const name = (universities as { name?: unknown }).name
      return typeof name === 'string' && name.trim() ? [name.trim()] : null
    })()

    const campuses = p['campuses']
    const campusNames = (() => {
      if (!campuses || typeof campuses !== 'object') return null
      if (Array.isArray(campuses)) {
        const out = campuses
          .map((c) => {
            if (!c || typeof c !== 'object') return ''
            const name = (c as { name?: unknown }).name
            return typeof name === 'string' ? name.trim() : ''
          })
          .filter(Boolean)
        return out.length ? out : null
      }
      const name = (campuses as { name?: unknown }).name
      return typeof name === 'string' && name.trim() ? [name.trim()] : null
    })()

    const propertyFeatures = Array.isArray(p['property_features']) ? p['property_features'] : null
    const amenities = propertyFeatures
      ? propertyFeatures
          .map((pf) => {
            if (!pf || typeof pf !== 'object') return ''
            const features = (pf as { features?: unknown }).features
            if (!features || typeof features !== 'object') return ''
            const name = (features as { name?: unknown }).name
            return typeof name === 'string' ? name.trim() : ''
          })
          .filter(Boolean)
      : null

    const rentStr = (() => {
      if (typeof rentPerWeek === 'number' && Number.isFinite(rentPerWeek)) return `${rentPerWeek}`
      if (typeof rentPerWeek === 'string' && rentPerWeek.trim()) return rentPerWeek.trim()
      return ''
    })()
    const bedsStr = typeof beds === 'number' ? `${beds}` : typeof beds === 'string' && beds.trim() ? beds.trim() : ''
    const bathsStr = typeof baths === 'number' ? `${baths}` : typeof baths === 'string' && baths.trim() ? baths.trim() : ''
    const bondStr = typeof bond === 'number' ? `${bond}` : typeof bond === 'string' && bond.trim() ? bond.trim() : ''
    const featuredStr = featured || ''
    const distanceStr =
      typeof distanceToCampusKm === 'number' && Number.isFinite(distanceToCampusKm)
        ? `${distanceToCampusKm} km`
        : typeof distanceToCampusKm === 'string' && distanceToCampusKm.trim()
          ? `${distanceToCampusKm.trim()} km`
          : ''

    const header = title
      ? `Listing: ${title}${suburb ? ` (${suburb}${state ? `, ${state}` : ''})` : ''}`
      : `Listing: ${id || slug || 'Unknown'}`

    const lines: string[] = [header]
    if (id) lines.push(`- id: ${id}`)
    if (slug) lines.push(`- slug: ${slug}`)
    if (roomType) lines.push(`- room_type: ${roomType}`)
    if (suburb) lines.push(`- suburb: ${suburb}`)
    if (state) lines.push(`- state: ${state}`)
    if (rentStr) lines.push(`- rent_per_week (AUD): ${rentStr}`)
    if (bedsStr) lines.push(`- bedrooms: ${bedsStr}`)
    if (bathsStr) lines.push(`- bathrooms: ${bathsStr}`)
    if (bondStr) lines.push(`- bond (AUD): ${bondStr}`)
    if (leaseLength) lines.push(`- lease_length: ${leaseLength}`)
    if (availableFrom) lines.push(`- available_from: ${availableFrom}`)
    if (furnished) lines.push(`- furnished: ${furnished}`)
    if (linenSupplied) lines.push(`- linen_supplied: ${linenSupplied}`)
    if (weeklyCleaningService) lines.push(`- weekly_cleaning_service: ${weeklyCleaningService}`)
    if (featuredStr) lines.push(`- featured: ${featuredStr}`)
    if (distanceStr) lines.push(`- distance_to_campus_km (approx): ${distanceStr}`)
    if (uniNames && uniNames.length > 0) lines.push(`- universities: ${uniNames.join(', ')}`)
    if (campusNames && campusNames.length > 0) lines.push(`- campuses: ${campusNames.join(', ')}`)
    if (amenities && amenities.length > 0) lines.push(`- amenities / features: ${amenities.join(', ')}`)
    if (createdAt) lines.push(`- created_at: ${createdAt}`)

    blocks.push(lines.join('\n'))
  }

  return blocks.join('\n\n')
}
