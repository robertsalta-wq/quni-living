import type { Property } from './listings'
import { absoluteUrl } from './site'

export function buildPropertyMetaDescription(
  p: Property,
  opts: { campusDisplay: string | null; roomLabel: string | null },
): string {
  const rent = Number(p.rent_per_week)
  const bits: string[] = [p.title.trim(), `From $${rent.toLocaleString(undefined, { maximumFractionDigits: 0 })}/week`]
  if (opts.roomLabel) bits.push(opts.roomLabel)
  if (p.suburb?.trim()) bits.push(p.suburb.trim())
  if (opts.campusDisplay) bits.push(`Near ${opts.campusDisplay}`)
  bits.push('Verified student accommodation on Quni Living, Australia.')
  let out = bits.filter(Boolean).join('. ')
  if (out.length > 158) out = `${out.slice(0, 155)}…`
  return out
}

export function propertyListingJsonLd(
  p: Property,
  slug: string,
  opts: { campusDisplay: string | null; roomLabel: string | null },
): Record<string, unknown>[] {
  const rent = Number(p.rent_per_week)
  const url = absoluteUrl(`/listings/${slug}`)
  const imgs = (p.images ?? []).filter(Boolean).slice(0, 8)

  const accommodation: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Accommodation',
    name: p.title,
    description: buildPropertyMetaDescription(p, opts),
    url,
    ...(imgs.length ? { image: imgs } : {}),
  }

  if (p.latitude != null && p.longitude != null) {
    accommodation.geo = {
      '@type': 'GeoCoordinates',
      latitude: p.latitude,
      longitude: p.longitude,
    }
  }

  const hasAddress = p.address || p.suburb || p.state || p.postcode
  if (hasAddress) {
    accommodation.address = {
      '@type': 'PostalAddress',
      ...(p.address ? { streetAddress: p.address } : {}),
      ...(p.suburb ? { addressLocality: p.suburb } : {}),
      ...(p.state ? { addressRegion: p.state } : {}),
      ...(p.postcode ? { postalCode: String(p.postcode) } : {}),
      addressCountry: 'AU',
    }
  }

  accommodation.offers = {
    '@type': 'Offer',
    url,
    price: rent,
    priceCurrency: 'AUD',
    availability: 'https://schema.org/InStock',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: rent,
      priceCurrency: 'AUD',
      unitText: 'WEEK',
    },
  }

  const breadcrumb: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Listings',
        item: absoluteUrl('/listings'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: p.title,
        item: url,
      },
    ],
  }

  return [accommodation, breadcrumb]
}
