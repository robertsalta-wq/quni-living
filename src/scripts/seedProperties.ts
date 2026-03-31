import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database.types'

type PropertyInsert = Database['public']['Tables']['properties']['Insert']

const LANDLORD_IDS = [
  '99cb127f-36a3-4ede-84b9-6e6cb2594870',
  '12053ed0-61b5-4c6c-bbbf-872b9be651ef',
  'ab9112b8-68c4-4326-9d14-05c85e7306ba',
] as const

const PROPERTY_IMAGES = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?w=800',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
  'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800',
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
  'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800',
  'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800',
  'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800',
  'https://images.unsplash.com/photo-1617098474202-0d0d7f60f70b?w=800',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800',
] as const

type SeedDraft = {
  title: string
  description: string
  rentPerWeek: number
  roomType: 'studio' | 'single' | 'shared'
  propertyType: 'apartment' | 'house' | 'townhouse'
  bedrooms: number
  bathrooms: 1 | 2
  leaseLength: '6-months' | '12-months' | 'flexible'
  listingMode: 'entire-place' | 'room-only'
  address: string
  suburb: string
  postcode: string
  universityId: string
  campusId: string
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function addDaysIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const drafts: SeedDraft[] = [
  {
    title: 'Bright Studio Apartment in Newtown Village',
    description:
      'This light-filled studio sits on a quiet street just behind King Street in Newtown. It includes built-in storage, a full kitchen, and a private balcony for morning study sessions. Cafes, buses, and Newtown Station are all within walking distance. The University of Sydney is only a short walk or one quick bus ride away.',
    rentPerWeek: 420,
    roomType: 'studio',
    propertyType: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
    leaseLength: '12-months',
    listingMode: 'entire-place',
    address: '14 Wilson Street',
    suburb: 'Newtown',
    postcode: '2042',
    universityId: '11111111-0000-0000-0000-000000000001',
    campusId: '22222222-0000-0000-0000-000000000002',
  },
  {
    title: 'Affordable Shared Room Near Glebe Point Road',
    description:
      'A friendly shared-room setup in a tidy terrace home close to Glebe Point Road eateries. The room is fully furnished and the home has a sunny backyard and fast NBN internet. Broadway Shopping Centre and local bus links are nearby for daily convenience. USYD campus access is straightforward on foot or by bus.',
    rentPerWeek: 235,
    roomType: 'shared',
    propertyType: 'house',
    bedrooms: 1,
    bathrooms: 1,
    leaseLength: '6-months',
    listingMode: 'room-only',
    address: '87 Glebe Point Road',
    suburb: 'Glebe',
    postcode: '2037',
    universityId: '11111111-0000-0000-0000-000000000001',
    campusId: '22222222-0000-0000-0000-000000000002',
  },
  {
    title: 'Quiet One Bedroom Townhouse in Camperdown',
    description:
      'This one-bedroom townhouse offers a calm setup ideal for focused study. The property has a modern kitchen, internal laundry, and excellent natural light throughout the day. Camperdown Park and local supermarkets are just around the corner. You can reach USYD in minutes by bike or a short walk.',
    rentPerWeek: 495,
    roomType: 'single',
    propertyType: 'townhouse',
    bedrooms: 1,
    bathrooms: 2,
    leaseLength: 'flexible',
    listingMode: 'entire-place',
    address: '29 Fowler Street',
    suburb: 'Camperdown',
    postcode: '2050',
    universityId: '11111111-0000-0000-0000-000000000001',
    campusId: '22222222-0000-0000-0000-000000000002',
  },
  {
    title: 'Modern Studio with Balcony in Glebe',
    description:
      'A modern studio apartment positioned in central Glebe with leafy district views. It features a separate study nook, secure building access, and an updated bathroom. Tramsheds dining and waterfront walks are nearby for weekends. Commute to USYD is quick via regular buses and cycle routes.',
    rentPerWeek: 445,
    roomType: 'studio',
    propertyType: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
    leaseLength: '12-months',
    listingMode: 'entire-place',
    address: '6 Toxteth Road',
    suburb: 'Glebe',
    postcode: '2037',
    universityId: '11111111-0000-0000-0000-000000000001',
    campusId: '22222222-0000-0000-0000-000000000003',
  },
  {
    title: 'Cozy Shared Room in Newtown Terrace House',
    description:
      'This furnished shared room is set inside a classic Newtown terrace with a welcoming household. You will have access to a large kitchen, separate lounge, and outdoor patio. Grocery stores, cafes, and train connections are all close by. USYD students love the location for its easy walkability and energy.',
    rentPerWeek: 215,
    roomType: 'shared',
    propertyType: 'house',
    bedrooms: 1,
    bathrooms: 1,
    leaseLength: 'flexible',
    listingMode: 'room-only',
    address: '41 Enmore Road',
    suburb: 'Newtown',
    postcode: '2042',
    universityId: '11111111-0000-0000-0000-000000000001',
    campusId: '22222222-0000-0000-0000-000000000003',
  },
  {
    title: 'Spacious One Bedroom Apartment in Camperdown',
    description:
      'A spacious one-bedroom apartment with updated interiors and secure basement parking. The unit includes a full-size kitchen, split-system air conditioning, and generous wardrobe space. Royal Prince Alfred Hospital precinct and local cafes are nearby. It is a convenient base for students attending USYD.',
    rentPerWeek: 510,
    roomType: 'single',
    propertyType: 'apartment',
    bedrooms: 2,
    bathrooms: 2,
    leaseLength: '6-months',
    listingMode: 'entire-place',
    address: '102 Parramatta Road',
    suburb: 'Camperdown',
    postcode: '2050',
    universityId: '11111111-0000-0000-0000-000000000001',
    campusId: '22222222-0000-0000-0000-000000000003',
  },
  {
    title: 'Fresh Studio Close to UNSW Kensington Gates',
    description:
      'A freshly updated studio in Kensington with secure entry and plenty of sunlight. The apartment includes quality furnishings, a practical kitchenette, and mirrored built-ins. Local light rail and bus routes are a short stroll away. UNSW Kensington campus is reachable within minutes.',
    rentPerWeek: 400,
    roomType: 'studio',
    propertyType: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
    leaseLength: '12-months',
    listingMode: 'entire-place',
    address: '18 Todman Avenue',
    suburb: 'Kensington',
    postcode: '2033',
    universityId: '11111111-0000-0000-0000-000000000002',
    campusId: '22222222-0000-0000-0000-000000000005',
  },
  {
    title: 'Shared Student Room in Randwick Near Light Rail',
    description:
      'Comfortable shared-room accommodation in Randwick suited to students wanting a social home. The property offers a large kitchen, internal laundry, and dedicated study desks. Centennial Park and The Spot dining precinct are nearby for downtime. Light rail and buses provide a direct trip to UNSW.',
    rentPerWeek: 260,
    roomType: 'shared',
    propertyType: 'townhouse',
    bedrooms: 1,
    bathrooms: 2,
    leaseLength: '6-months',
    listingMode: 'room-only',
    address: '52 Belmore Road',
    suburb: 'Randwick',
    postcode: '2031',
    universityId: '11111111-0000-0000-0000-000000000002',
    campusId: '22222222-0000-0000-0000-000000000005',
  },
  {
    title: 'One Bedroom House in Maroubra with Parking',
    description:
      'This one-bedroom house in Maroubra offers privacy, space, and off-street parking. Inside you will find a renovated kitchen, timber floors, and a separate living area. Pacific Square and coastal walks are all close by. Commute to UNSW is easy via direct bus services.',
    rentPerWeek: 470,
    roomType: 'single',
    propertyType: 'house',
    bedrooms: 3,
    bathrooms: 2,
    leaseLength: 'flexible',
    listingMode: 'entire-place',
    address: '9 Mons Avenue',
    suburb: 'Maroubra',
    postcode: '2035',
    universityId: '11111111-0000-0000-0000-000000000002',
    campusId: '22222222-0000-0000-0000-000000000005',
  },
  {
    title: 'Sunny Studio Apartment in Randwick Village',
    description:
      'Sunny studio apartment located in the heart of Randwick village and close to daily essentials. It includes a modern bathroom, built-in wardrobe, and compact but functional kitchen. Cafes, supermarkets, and pharmacy options are nearby. Access to UNSW is straightforward by light rail or bike.',
    rentPerWeek: 390,
    roomType: 'studio',
    propertyType: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
    leaseLength: '12-months',
    listingMode: 'entire-place',
    address: '23 Avoca Street',
    suburb: 'Randwick',
    postcode: '2031',
    universityId: '11111111-0000-0000-0000-000000000002',
    campusId: '22222222-0000-0000-0000-000000000006',
  },
  {
    title: 'Budget Shared Room in Kensington Townhouse',
    description:
      'A budget-friendly shared room in a tidy Kensington townhouse designed for student living. The home has a spacious common lounge, two bathrooms, and a covered courtyard. Local gyms, takeaway spots, and bus connections are nearby. Reaching UNSW is fast and reliable throughout the week.',
    rentPerWeek: 230,
    roomType: 'shared',
    propertyType: 'townhouse',
    bedrooms: 1,
    bathrooms: 2,
    leaseLength: 'flexible',
    listingMode: 'room-only',
    address: '37 Doncaster Avenue',
    suburb: 'Kensington',
    postcode: '2033',
    universityId: '11111111-0000-0000-0000-000000000002',
    campusId: '22222222-0000-0000-0000-000000000006',
  },
  {
    title: 'One Bedroom Apartment with Study in Maroubra',
    description:
      'A one-bedroom apartment plus study in Maroubra with a bright open-plan layout. It includes quality appliances, internal laundry, and secure intercom access. The beach, local shopping, and green spaces are all close for weekends. Public transport links provide an easy route to UNSW.',
    rentPerWeek: 505,
    roomType: 'single',
    propertyType: 'apartment',
    bedrooms: 2,
    bathrooms: 1,
    leaseLength: '6-months',
    listingMode: 'entire-place',
    address: '75 Boyce Road',
    suburb: 'Maroubra',
    postcode: '2035',
    universityId: '11111111-0000-0000-0000-000000000002',
    campusId: '22222222-0000-0000-0000-000000000006',
  },
  {
    title: 'Modern Studio in Macquarie Park Tech Precinct',
    description:
      'Modern studio accommodation in Macquarie Park close to shopping and transport. The apartment offers secure access, split-system air conditioning, and practical storage. Macquarie Centre, Metro services, and local parks are all nearby. Macquarie University is only a short commute away.',
    rentPerWeek: 410,
    roomType: 'studio',
    propertyType: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
    leaseLength: '12-months',
    listingMode: 'entire-place',
    address: '2 Mooltan Avenue',
    suburb: 'Macquarie Park',
    postcode: '2113',
    universityId: '11111111-0000-0000-0000-000000000004',
    campusId: '22222222-0000-0000-0000-000000000010',
  },
  {
    title: 'Shared Room in Ryde Family Home',
    description:
      'Shared-room option in a clean Ryde family home with a peaceful atmosphere. Residents have access to a large kitchen, dedicated study corner, and laundry facilities. Top Ryde shopping and frequent bus routes are nearby for everyday convenience. Macquarie University is easy to reach by public transport.',
    rentPerWeek: 205,
    roomType: 'shared',
    propertyType: 'house',
    bedrooms: 1,
    bathrooms: 1,
    leaseLength: 'flexible',
    listingMode: 'room-only',
    address: '118 Blaxland Road',
    suburb: 'Ryde',
    postcode: '2112',
    universityId: '11111111-0000-0000-0000-000000000004',
    campusId: '22222222-0000-0000-0000-000000000010',
  },
  {
    title: 'One Bedroom Townhouse Near Meadowbank Ferry',
    description:
      'One-bedroom townhouse near Meadowbank ferry and train station for flexible commuting. The home has a private courtyard, modern bathroom, and generous living area. Riverside walking tracks and local cafes are moments away. Macquarie University is accessible by bus, train, or bike connection.',
    rentPerWeek: 460,
    roomType: 'single',
    propertyType: 'townhouse',
    bedrooms: 2,
    bathrooms: 2,
    leaseLength: '6-months',
    listingMode: 'entire-place',
    address: '11 Constitution Road',
    suburb: 'Meadowbank',
    postcode: '2114',
    universityId: '11111111-0000-0000-0000-000000000004',
    campusId: '22222222-0000-0000-0000-000000000010',
  },
]

const availableDayOffsets = [2, 4, 6, 8, 10, 13, 15, 18, 21, 24, 27, 30, 33, 36, 40]
const featuredIndexes = new Set([0, 3, 6, 9, 12])
const linenTrueIndexes = new Set([1, 4, 7, 10, 13])
const weeklyCleaningTrueIndexes = new Set([2, 8, 14])

function toListingPropertyType(mode: SeedDraft['listingMode']): string {
  return mode === 'entire-place' ? 'entire_property' : 'private_room_landlord_off_site'
}

async function run() {
  loadEnvFile('.env')
  loadEnvFile('.env.local')

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const payload: (PropertyInsert & { show_add_another_university?: boolean })[] = drafts.map((draft, index) => {
    const slug = toSlug(`${draft.title} ${draft.suburb} ${draft.universityId.slice(-4)} ${index + 1}`)
    return {
      title: draft.title,
      slug,
      description: draft.description,
      rent_per_week: draft.rentPerWeek,
      room_type: draft.roomType,
      images: [PROPERTY_IMAGES[index]],
      bedrooms: draft.bedrooms,
      bathrooms: draft.bathrooms,
      furnished: true,
      bond: draft.rentPerWeek * 4,
      lease_length: draft.leaseLength,
      listing_type: 'rent',
      featured: featuredIndexes.has(index),
      address: draft.address,
      suburb: draft.suburb,
      state: 'NSW',
      postcode: draft.postcode,
      landlord_id: LANDLORD_IDS[index % LANDLORD_IDS.length],
      university_id: draft.universityId,
      campus_id: draft.campusId,
      available_from: addDaysIso(availableDayOffsets[index]),
      status: 'active',
      linen_supplied: linenTrueIndexes.has(index),
      weekly_cleaning_service: weeklyCleaningTrueIndexes.has(index),
      property_type: toListingPropertyType(draft.listingMode),
      show_add_another_university: false,
    }
  })

  const slugs = payload.map((p) => p.slug)
  const { data: existingRows, error: existingError } = await supabase
    .from('properties')
    .select('slug')
    .in('slug', slugs)

  if (existingError) {
    console.error('Failed checking existing seed properties:', existingError.message)
    process.exit(1)
  }

  const existing = new Set((existingRows ?? []).map((row) => row.slug))
  const existingCount = payload.filter((p) => existing.has(p.slug)).length
  const newCount = payload.length - existingCount

  const { data, error } = await supabase
    .from('properties')
    .upsert(payload, { onConflict: 'slug' })
    .select('id')

  if (error) {
    console.error('Failed seeding properties:', error.message)
    process.exit(1)
  }

  console.log(
    `Upserted ${data?.length ?? 0} rows successfully (${newCount} inserted, ${existingCount} updated).`,
  )
}

run().catch((error: unknown) => {
  console.error('Unexpected seed failure:', error)
  process.exit(1)
})

function loadEnvFile(fileName: string) {
  const fullPath = path.resolve(process.cwd(), fileName)
  if (!fs.existsSync(fullPath)) return

  const raw = fs.readFileSync(fullPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex <= 0) continue

    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}
