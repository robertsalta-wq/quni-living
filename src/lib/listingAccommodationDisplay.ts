import { isPropertyListingType, isRoomType, type PropertyListingType } from './listings'

export type AccommodationDisplayInput = {
  property_type?: string | null
  room_type?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
}

function propertyListingType(property: AccommodationDisplayInput): PropertyListingType | null {
  const pt = typeof property.property_type === 'string' ? property.property_type.trim() : ''
  return pt && isPropertyListingType(pt) ? pt : null
}

export function isRoomListingProperty(property: AccommodationDisplayInput): boolean {
  const pt = propertyListingType(property)
  if (pt) return pt !== 'entire_property'
  const rt = property.room_type
  return rt === 'single' || rt === 'shared'
}

export function propertyTotalBedrooms(property: AccommodationDisplayInput): number {
  const n = Math.floor(Number(property.bedrooms))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function propertyTotalBathrooms(property: AccommodationDisplayInput): number {
  const n = Math.floor(Number(property.bathrooms))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/** Whole-house bed count is meaningful (landlord entered totals, not legacy "1 room"). */
export function hasWholePropertyBedCount(property: AccommodationDisplayInput): boolean {
  return isRoomListingProperty(property) && propertyTotalBedrooms(property) > 1
}

function bedBathCompact(beds: number, baths: number): string {
  return `${beds} bed · ${baths} bath`
}

/** Card context line, e.g. "1 private room in a 5 bed · 2 bath share house". */
export function formatListingCardContextLine(property: AccommodationDisplayInput): string | null {
  if (!hasWholePropertyBedCount(property)) return null

  const beds = propertyTotalBedrooms(property)
  const baths = propertyTotalBathrooms(property) || 1
  const house = bedBathCompact(beds, baths)
  const pt = propertyListingType(property)
  const rt = property.room_type && isRoomType(property.room_type) ? property.room_type : null

  if (pt === 'shared_room' || rt === 'shared') {
    return `Shared room in a ${house} share house`
  }
  if (pt === 'private_room_landlord_on_site') {
    return `1 private room in a ${house} home`
  }
  if (rt === 'studio') {
    return `Studio room in a ${house} share house`
  }
  return `1 private room in a ${house} share house`
}

export function formatListingCardBedIconLabel(property: AccommodationDisplayInput): string | null {
  if (isRoomListingProperty(property)) {
    if (!hasWholePropertyBedCount(property)) return null
    return `${propertyTotalBedrooms(property)} bed house`
  }
  const beds = propertyTotalBedrooms(property) || 1
  return `${beds} bed`
}

export function formatListingCardBathIconLabel(property: AccommodationDisplayInput): string | null {
  if (isRoomListingProperty(property)) {
    if (!hasWholePropertyBedCount(property)) return null
    return `${propertyTotalBathrooms(property) || 1} bath`
  }
  return `${propertyTotalBathrooms(property) || 1} bath`
}

export type ListingAccommodationStatsModel =
  | { kind: 'entire'; beds: number; baths: number }
  | {
      kind: 'room_in_house'
      roomTitle: string
      roomSubtitle: string
      beds: number
      baths: number
      houseLabel: 'share house' | 'home'
    }
  | { kind: 'simple'; beds: number; baths: number; roomLabel: string | null }

export function resolveListingAccommodationStats(
  property: AccommodationDisplayInput,
  roomLabel: string | null,
): ListingAccommodationStatsModel {
  const beds = propertyTotalBedrooms(property) || 1
  const baths = propertyTotalBathrooms(property) || 1
  const pt = propertyListingType(property)
  const rt = property.room_type && isRoomType(property.room_type) ? property.room_type : null

  if (hasWholePropertyBedCount(property)) {
    if (pt === 'shared_room' || rt === 'shared') {
      return {
        kind: 'room_in_house',
        roomTitle: 'Shared room',
        roomSubtitle: 'Shared bedroom',
        beds,
        baths,
        houseLabel: 'share house',
      }
    }
    if (pt === 'private_room_landlord_on_site') {
      return {
        kind: 'room_in_house',
        roomTitle: roomLabel ?? 'Private room',
        roomSubtitle: 'In landlord’s home',
        beds,
        baths,
        houseLabel: 'home',
      }
    }
    if (rt === 'studio') {
      return {
        kind: 'room_in_house',
        roomTitle: roomLabel ?? 'Studio room',
        roomSubtitle: 'Your space',
        beds,
        baths,
        houseLabel: 'share house',
      }
    }
    return {
      kind: 'room_in_house',
      roomTitle: roomLabel ?? 'Private room',
      roomSubtitle: 'Your space',
      beds,
      baths,
      houseLabel: 'share house',
    }
  }

  if (isRoomListingProperty(property)) {
    return { kind: 'simple', beds, baths, roomLabel }
  }

  return { kind: 'entire', beds, baths }
}

/** Detail sidebar - full sentence. */
export function formatListingDetailAccommodation(property: AccommodationDisplayInput): string | null {
  if (!hasWholePropertyBedCount(property)) return null

  const beds = propertyTotalBedrooms(property)
  const baths = propertyTotalBathrooms(property) || 1
  const bedWord = beds === 1 ? 'bedroom' : 'bedrooms'
  const bathWord = baths === 1 ? 'bathroom' : 'bathrooms'
  const pt = propertyListingType(property)
  const rt = property.room_type && isRoomType(property.room_type) ? property.room_type : null

  if (pt === 'shared_room' || rt === 'shared') {
    return `Shared bedroom in a ${beds} ${bedWord}, ${baths} ${bathWord} house`
  }
  if (pt === 'private_room_landlord_on_site') {
    return `Private room in a ${beds} ${bedWord}, ${baths} ${bathWord} home`
  }
  return `1 private room in a ${beds} ${bedWord}, ${baths} ${bathWord} house`
}
