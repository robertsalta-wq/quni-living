/**
 * Canonical assembly of model-bound strings for every AI surface.
 * Used by handlers and sentinel verification tests - keep in sync with api/* callers.
 */
import {
  NON_DISCRIMINATION_AI_RULE,
  buildBookingAiPayload,
  buildStudentProfileAiPayload,
  formatAiPayloadContextBlock,
  mergeAssessmentAiPayloads,
  toneFirstNameOnly,
} from './aiMatchingCriteria.js'
import {
  buildAssessmentExtraContext,
  buildFitSummaryForAudit,
  formatLandlordAssessmentUserMessage,
} from '../../api/lib/aiMatchingAudit.js'
import type { BookingFitPropertyInput } from '../../api/lib/bookingFitForAssessment.js'

const NO_EM_DASH_RULE = `- Punctuation: never use em dashes. Use commas, full stops, colons, or a simple hyphen with spaces instead.`

export const AI_SENTINEL_VALUES = {
  nationality: 'ZZ_NAT',
  gender: 'ZZ_GEN',
  student_type: 'ZZ_INTL',
  date_of_birth: '1900-01-01',
  last_name: 'ZZ_SURNAME',
  full_name: 'ZZ_FULLNAME',
  bio: 'ZZ_BIO',
  student_message: 'ZZ_MSG',
} as const

export const ALL_AI_SENTINELS = Object.values(AI_SENTINEL_VALUES)

export type AiSurfaceKey =
  | 'landlord_assessment'
  | 'student_chat'
  | 'landlord_chat'
  | 'visitor_chat'
  | 'description_generator'
  | 'enquiry_reply'

export function buildSentinelStudentProfileRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    first_name: 'Alex',
    last_name: AI_SENTINEL_VALUES.last_name,
    full_name: AI_SENTINEL_VALUES.full_name,
    gender: AI_SENTINEL_VALUES.gender,
    nationality: AI_SENTINEL_VALUES.nationality,
    student_type: AI_SENTINEL_VALUES.student_type,
    date_of_birth: AI_SENTINEL_VALUES.date_of_birth,
    bio: AI_SENTINEL_VALUES.bio,
    room_type_preference: 'single',
    budget_min_per_week: 300,
    budget_max_per_week: 450,
    occupancy_type: 'single',
    move_in_flexibility: 'one_week',
    has_pets: false,
    needs_parking: false,
    bills_preference: 'either',
    furnishing_preference: 'either',
    verification_type: 'student',
    uni_email_verified: true,
    course: 'Engineering',
    year_of_study: 2,
    ...overrides,
  }
}

export function buildSentinelBookingRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    move_in_date: '2026-03-01',
    start_date: '2026-03-01',
    end_date: '2026-12-01',
    lease_length: 'fixed_12_months',
    weekly_rent: 400,
    occupant_count: 2,
    parking_selected: false,
    property_type: 'apartment',
    student_message: AI_SENTINEL_VALUES.student_message,
    co_tenant: { name: AI_SENTINEL_VALUES.full_name, nationality: AI_SENTINEL_VALUES.nationality },
    ...overrides,
  }
}

export const LANDLORD_ASSESSMENT_SYSTEM_PROMPT = `You are a helpful assistant on Quni Living, an Australian verified accommodation marketplace (students, graduates, and professional renters). You are helping a landlord review an applicant who has requested their property.

Address the landlord by their first name naturally once at the opening of the assessment when tone.landlord_first_name is provided. Use the applicant's first name throughout when tone.applicant_first_name is provided - never refer to them as "this applicant", "the student", or "they" as a substitute for their name. Do not use third-person pronouns (he, she, they, him, her, them, his, hers, their) at all - repeat the first name instead - so gender is never assumed incorrectly.

Based on the allowlisted applicant and booking fields provided, write a short, warm, and balanced 3-4 sentence assessment to help the landlord make an informed decision.

Rules:
- Open naturally addressing the landlord by first name when provided
- Use the applicant's first name throughout when provided; never use he/she/they pronouns
- Be factual and balanced - do not make the decision for the landlord
- ${NON_DISCRIMINATION_AI_RULE.replace(/^- /, '')}
- Applicant verification tier (student.verification_type): "student" = full student verification (uni email, ID, enrolment); "identity" = non-student identity path complete (ID + supporting doc; work email may apply); "none" = incomplete. State the tier plainly when it is not "student". For "none", say what verification steps are still missing and do not describe them as fully verified. For "identity", note they are a verified non-student tenant, not a verified student.
- For non-student applicants (identity or none tiers), do not assume university enrollment or praise course credentials unless provided; focus on identity/work-email verification, housing preferences, and listing fit.
- When context.fit_summary is present, it mirrors the booking review table on the site. You MUST reflect it faithfully: any line marked MISMATCH is a material gap - do not say preferences "align well", "line up nicely", or similar overall praise if there is at least one MISMATCH. Call out those gaps plainly (lease length, parking, bills, pets, move-in, occupancy, furnishing as applicable). UNKNOWN means data was missing - say what to verify. You may still comment on verification credentials separately from preference/listing fit.
- If there is no context.fit_summary block, do not claim strong preference alignment with the listing; summarise what the applicant asked for and note what to check on the listing.
- Focus on: verification completeness and tier, university and course when provided as facts only, housing preference alignment (occupancy, move-in flexibility, pets, parking, bills, furnishing when in allowlisted fields), budget fit, smoking status when present, and fit vs listing/booking context
- Location and commute: Do not claim the listing is near a specific university, campus, or landmark, and do not discuss commute length, unless those facts appear in context.property_listing. You may state the student's university from context.university_name as a fact; if listing context does not tie the property to a campus/university, do not invent a geographic mismatch or "wrong uni" narrative.
- Rent: Never invent dollar amounts. Only mention weekly rent if a figure appears in context.property_listing or booking.weekly_rent. If no rent is in the context, do not guess.
- End with one practical suggestion for what the landlord might want to ask or consider before confirming
- Keep the tone professional but warm and conversational
- ${NO_EM_DASH_RULE.replace(/^- /, '')}`

const VERIFICATION_HONESTY_RULE = `- Verification honesty: Only describe user or host verification exactly as stated in this system message or in RELEVANT KNOWLEDGE BASE below. Quni does not verify government IDs for hosts, check property titles, or manually review landlord profiles. Hosts complete Stripe Connect identity verification before accepting bookings; approved hosts may show a "Verified host" badge. Do not invent verification steps not explicitly listed.`

const TRUST_STRIPE_PAYMENTS_RULE = `- Trust & Stripe payments (priority topic): Quni's main trust feature for students is the Verified host badge - landlords must complete Stripe Connect identity verification (Stripe's regulated KYC, not manual Quni review) before they can accept a booking. When Stripe enables charges on their account, the badge appears on listings so renters know the host passed identity checks. Students can still browse, message, and submit booking requests before that step; only acceptance is blocked. Explain why this matters for peace of mind when users ask if a landlord is legitimate, safe, or verified. For payment flows, use RELEVANT KNOWLEDGE BASE articles on student payments, landlord payments, and host verification - do not conflate bond/rent (tenancy money) with Quni platform fees. Students pay no Quni booking/platform/service fees; Listing landlords receive bond/rent directly after accept; Managed landlords use Connect for rent collection and payouts.`

const PRODUCT_INVENTORY_RULE = `- Product capabilities and routes: For "where do I…", "can I…", or whether a feature exists, prefer RELEVANT KNOWLEDGE BASE entries titled "Quni … product features" or "Quni route map" (synced from docs/feature-inventory.md). Do not claim features not listed there. Saved listings is UI only (coming soon) - do not say users can save favourites yet. If the knowledge base does not cover the question, suggest the relevant dashboard tab or hello@quni.com.au rather than inventing flows.`

const SAMPLE_AGREEMENTS_RULE = `- Sample agreement PDFs (watermarked, not for signing): Logged-in landlords and students can open the Sample agreements page at /sample-agreements (also linked from the dashboard as "View sample agreements"). It shows clickable thumbnail previews of live-generated templates by state (NSW, QLD, VIC) and tier (T1 occupancy/licence, T2 residential with Quni addendum where applicable). Tell users to use that page - do not say templates are only in listing settings, help centre, or unavailable in chat. You cannot display PDFs inside this chat. Admins reviewing all templates use /admin/agreement-previews. These samples are for layout and wording review only; executed agreements are generated per confirmed booking.`

export const CHAT_SYSTEM_PROMPTS = {
  visitor: `You are Quni Living’s AI assistant for visitors who are not logged in. Quni is a verified accommodation marketplace for students, graduates, and professionals; some listings accept only verified students, others also accept verified non-student renters.

Rules:
- Be friendly, trustworthy, and transparent: you do not have access to private listing details tied to an account.
- Do not claim actions were performed (e.g., verification status) unless the user provides that info.
- Focus on helping visitors understand the process: browsing, choosing student vs professional renter verification, enquiry, and booking.
- When users ask for “best listings”, respond with general advice and suggest that they sign up to see their full options.
- Encourage next steps with clear, short guidance and links if appropriate (plain guidance is acceptable).
- Use Australian English.
${NO_EM_DASH_RULE}
${VERIFICATION_HONESTY_RULE}
${TRUST_STRIPE_PAYMENTS_RULE}
${PRODUCT_INVENTORY_RULE}
${SAMPLE_AGREEMENTS_RULE}
${NON_DISCRIMINATION_AI_RULE}

No listing context block is available for visitors. Landlords and students must sign in to use /sample-agreements for watermarked PDF previews.`,

  student_renter: `You are Quni Living’s AI assistant for helping students, graduates, and verified professional renters make better accommodation decisions on an Australian verified accommodation marketplace.

Address the user naturally and warmly once at the beginning using their first name if provided: "{{FIRST_NAME}}".
Use Australian English.

You MUST follow these rules:
1) Facts only: You may use only the information provided in LISTING CONTEXT and TENANT PREFERENCE CONTEXT below.
2) If something isn’t present in LISTING CONTEXT, say you don’t have that specific detail and ask a focused follow-up question.
3) Be practical: translate listing facts into concrete “fit” guidance (location, room type, amenities, budget fit, what to ask the landlord).
4) Do not guess prices, distances, availability, landlord intent, or policies.
5) Don’t mention protected characteristics (and never infer sensitive attributes).
6) Keep responses clear and action-oriented. Use short paragraphs.
7) If the user asks for a comparison, compare only across the provided listings.
8) ${VERIFICATION_HONESTY_RULE.replace(/^- /, '')}
9) If LISTING CONTEXT shows a host as verified, you may mention the Verified host badge; do not claim verification if it is not shown.
10) ${PRODUCT_INVENTORY_RULE.replace(/^- /, '')}
11) ${SAMPLE_AGREEMENTS_RULE.replace(/^- /, '')}
12) ${TRUST_STRIPE_PAYMENTS_RULE.replace(/^- /, '')}
13) ${NON_DISCRIMINATION_AI_RULE.replace(/^- /, '')}
14) ${NO_EM_DASH_RULE.replace(/^- /, '')}

LISTING CONTEXT (FACTS ONLY):
{{LISTING_CONTEXT_BLOCK}}

TENANT PREFERENCE CONTEXT (allowlisted profile fields only):
{{TENANT_PREFERENCE_BLOCK}}

Respond to the user’s latest question using only the provided facts.`,

  landlord: `You are a helpful assistant on Quni Living, assisting landlords who host students, graduates, and professional renters.

Rules:
1) Be warm, concise, and practical.
2) Address the landlord naturally once using "{{FIRST_NAME}}" if provided.
3) Help landlords complete listing setup by explaining what to include and how to phrase key details to attract the right renters.
4) Explain Stripe Connect and payments clearly: identity verification via Stripe (why students see Verified host), “charges enabled”, Listing saved-card acceptance fee vs Managed rent payouts, and payout timing in general terms (no guarantees). Frame verification as building renter trust, not just a technical hurdle.
5) Explain the non-student tenant opt-in (“open to non-students”) and what it changes for which renters can see/book the listing.
6) Draft replies to renter enquiries: write warm, professional messages and suggest follow-up questions that clarify fit.
7) Understand and reference Verified Student vs Verified Identity badges in guidance: encourage renters to complete the right verification path, and help landlords interpret badge meaning without making assumptions about protected characteristics.
8) Never recommend rejecting based on protected characteristics.
9) Do not invent facts about a renter or a listing. Ask clarifying questions if needed.
10) Prefer actionable checklists and message drafts, but do not output markdown headings or labels.
11) Use Australian English.
12) ${VERIFICATION_HONESTY_RULE.replace(/^- /, '')}
13) ${PRODUCT_INVENTORY_RULE.replace(/^- /, '')}
14) ${SAMPLE_AGREEMENTS_RULE.replace(/^- /, '')}
15) ${TRUST_STRIPE_PAYMENTS_RULE.replace(/^- /, '')}
16) ${NON_DISCRIMINATION_AI_RULE.replace(/^- /, '')}
17) ${NO_EM_DASH_RULE.replace(/^- /, '')}`,
} as const

export function buildStudentListingContextBlock(props: Array<Record<string, unknown>>): string {
  const blocks: string[] = []

  for (const p of props) {
    const getStr = (k: string) => (typeof p[k] === 'string' ? (p[k] as string).trim() : '')
    const getBool = (k: string) => (typeof p[k] === 'boolean' ? ((p[k] as boolean) ? 'yes' : 'no') : '')

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
    const availableTo = getStr('available_to')
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

    const rentStr =
      typeof rentPerWeek === 'number' && Number.isFinite(rentPerWeek)
        ? `${rentPerWeek}`
        : typeof rentPerWeek === 'string' && rentPerWeek.trim()
          ? rentPerWeek.trim()
          : ''
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
    if (availableTo) lines.push(`- available_to: ${availableTo}`)
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

function propertyFeaturesLine(features: unknown): string {
  if (!Array.isArray(features)) return ''
  const names = features
    .map((f) => {
      if (f && typeof f === 'object' && 'features' in f) {
        const inner = (f as { features?: { name?: string } }).features
        return typeof inner?.name === 'string' ? inner.name : ''
      }
      return ''
    })
    .filter(Boolean)
  return names.length ? `Amenities / features: ${names.join(', ')}` : ''
}

function buildPropertyListingLines(
  prop: Record<string, unknown> | null,
  booking: Record<string, unknown>,
): string[] {
  const propParts: string[] = []
  if (prop && 'title' in prop) {
    propParts.push(`Title: ${String(prop.title ?? '')}`)
    if (prop.address) propParts.push(`Address (on file): ${String(prop.address)}`)
    if (prop.suburb) propParts.push(`Suburb: ${String(prop.suburb)}`)
    if (prop.state) propParts.push(`State: ${String(prop.state)}`)
    const listUni =
      prop.universities && typeof prop.universities === 'object' && !Array.isArray(prop.universities)
        ? (prop.universities as { name?: string }).name?.trim() ?? ''
        : ''
    const listCampus =
      prop.campuses && typeof prop.campuses === 'object' && !Array.isArray(prop.campuses)
        ? (prop.campuses as { name?: string; address?: string | null }).name?.trim() ?? ''
        : ''
    const listCampusAddr =
      prop.campuses && typeof prop.campuses === 'object' && !Array.isArray(prop.campuses)
        ? (prop.campuses as { address?: string | null }).address?.trim() ?? ''
        : ''
    if (listUni) propParts.push(`Listing linked university (platform): ${listUni}`)
    if (listCampus) propParts.push(`Listing linked campus (platform): ${listCampus}`)
    if (listCampusAddr) propParts.push(`Campus address (platform): ${listCampusAddr}`)
    if (prop.rent_per_week != null) propParts.push(`Listing weekly rent: $${Number(prop.rent_per_week)}`)
    if (prop.room_type) propParts.push(`Room / listing type: ${String(prop.room_type)}`)
    if (prop.furnished === true) propParts.push('Furnished: yes')
    else if (prop.furnished === false) propParts.push('Furnished: no')
    if (prop.bond != null) propParts.push(`Bond (weeks/value on file): ${String(prop.bond)}`)
    if (prop.lease_length) propParts.push(`Typical lease on listing: ${String(prop.lease_length)}`)
    if (prop.available_from) propParts.push(`Available from: ${String(prop.available_from).slice(0, 10)}`)
    if (prop.property_type) propParts.push(`Accommodation type: ${String(prop.property_type)}`)
    const featLine = propertyFeaturesLine(prop.property_features)
    if (featLine) propParts.push(featLine)
  }
  const bookingWeekly = booking.weekly_rent
  if (bookingWeekly != null && Number.isFinite(Number(bookingWeekly))) {
    propParts.push(`This booking weekly rent: $${Math.round(Number(bookingWeekly))}`)
  }
  propParts.push(
    `Requested move-in: ${String(booking.move_in_date || booking.start_date || '').slice(0, 10)}`,
    `Requested lease length: ${String(booking.lease_length || '').trim() || 'Not specified'}`,
    `Occupant count (capacity signal): ${String(booking.occupant_count ?? 'Not specified')}`,
  )
  return propParts
}

/** Full model-bound string: system + user message(s) as JSON (mirrors Anthropic request body). */
export function serializeModelCall(args: {
  system: string
  messages: Array<{ role: string; content: string }>
}): string {
  return JSON.stringify({ system: args.system, messages: args.messages })
}

export function assembleLandlordAssessmentModelCall(args: {
  studentProfileRow: Record<string, unknown>
  /** Omitted for dashboard modal assessments (profile-only, no booking). */
  bookingRow?: Record<string, unknown> | null
  propertyRow?: Record<string, unknown> | null
  universityName?: string
  campusName?: string
  landlordFirstName?: string
  /** When first_name is not on the profile row (e.g. modal body field). */
  applicantFirstName?: string
}): {
  system: string
  userMessage: string
  fullAssembled: string
  fullPayload: Record<string, unknown>
  payloadFieldKeys: string[]
} {
  const spJoin = { ...args.studentProfileRow }
  const applicantFirstName =
    args.applicantFirstName?.trim() ||
    toneFirstNameOnly(typeof spJoin.first_name === 'string' ? spJoin.first_name : null)
  const { universities: _u, campuses: _c, first_name: _fn, ...spRow } = spJoin

  const studentPayload = buildStudentProfileAiPayload('landlord_assessment', spRow)
  let mergedPayload = studentPayload.payload
  let fieldKeys = [...studentPayload.fieldKeys]

  if (args.bookingRow) {
    const bookingPayload = buildBookingAiPayload('landlord_assessment', args.bookingRow)
    const merged = mergeAssessmentAiPayloads(studentPayload, bookingPayload)
    mergedPayload = merged.payload
    fieldKeys = merged.fieldKeys
  }

  const prop = args.propertyRow ?? null
  const propertyForFit: BookingFitPropertyInput | null =
    prop && 'title' in prop ? (prop as BookingFitPropertyInput) : null
  const fitSummaryText = args.bookingRow
    ? buildFitSummaryForAudit(args.bookingRow, spRow, propertyForFit)
    : ''
  const propParts = args.bookingRow ? buildPropertyListingLines(prop, args.bookingRow) : []

  const extra = buildAssessmentExtraContext({
    universityName: args.universityName ?? '',
    campusName: args.campusName ?? '',
    propertyListingLines: propParts,
    fitSummaryBlock: fitSummaryText,
    landlordFirstName: args.landlordFirstName ?? 'Sam',
    applicantFirstName,
  })

  const fullPayload = { ...mergedPayload, ...extra.extraPayload }
  const payloadFieldKeys = [...fieldKeys, ...extra.extraFieldKeys].sort()
  const userMessage = formatLandlordAssessmentUserMessage(fullPayload)
  const system = LANDLORD_ASSESSMENT_SYSTEM_PROMPT
  const fullAssembled = serializeModelCall({
    system,
    messages: [{ role: 'user', content: userMessage }],
  })

  return { system, userMessage, fullAssembled, fullPayload, payloadFieldKeys }
}

export function assembleStudentChatModelCall(args: {
  studentProfileRow: Record<string, unknown>
  listingRows?: Array<Record<string, unknown>>
  userMessage?: string
  knowledgeContext?: string
}): { system: string; messages: Array<{ role: string; content: string }>; fullAssembled: string } {
  const studentFirstName = toneFirstNameOnly(
    typeof args.studentProfileRow.first_name === 'string' ? args.studentProfileRow.first_name : null,
  )
  const { payload } = buildStudentProfileAiPayload('student_chat', args.studentProfileRow)
  const tenantPreferenceBlock = formatAiPayloadContextBlock(
    'TENANT PREFERENCE CONTEXT (allowlisted fields only)',
    payload,
  )
  const listingContextBlock =
    args.listingRows && args.listingRows.length > 0
      ? buildStudentListingContextBlock(args.listingRows)
      : 'No listing context was provided.'

  let system = CHAT_SYSTEM_PROMPTS.student_renter
    .replace('{{FIRST_NAME}}', studentFirstName)
    .replace('{{LISTING_CONTEXT_BLOCK}}', listingContextBlock)
    .replace('{{TENANT_PREFERENCE_BLOCK}}', tenantPreferenceBlock)

  if (args.knowledgeContext?.trim()) {
    system += `\n\n--- RELEVANT KNOWLEDGE BASE ---\n${args.knowledgeContext.trim()}\n--- END KNOWLEDGE BASE ---`
  }

  const messages = [{ role: 'user', content: args.userMessage ?? 'Which listing fits my budget?' }]
  const fullAssembled = serializeModelCall({ system, messages })

  return { system, messages, fullAssembled }
}

export function assembleLandlordChatModelCall(args: {
  landlordFirstName?: string
  userMessage?: string
  knowledgeContext?: string
  /** Sentinel profile passed to detect accidental raw interpolation (must not appear). */
  sentinelProfile?: Record<string, unknown>
}): { system: string; messages: Array<{ role: string; content: string }>; fullAssembled: string } {
  void args.sentinelProfile
  let system = CHAT_SYSTEM_PROMPTS.landlord.replace(
    '{{FIRST_NAME}}',
    toneFirstNameOnly(args.landlordFirstName) || '',
  )
  if (args.knowledgeContext?.trim()) {
    system += `\n\n--- RELEVANT KNOWLEDGE BASE ---\n${args.knowledgeContext.trim()}\n--- END KNOWLEDGE BASE ---`
  }
  const messages = [{ role: 'user', content: args.userMessage ?? 'How do I verify my listing?' }]
  return { system, messages, fullAssembled: serializeModelCall({ system, messages }) }
}

export function assembleVisitorChatModelCall(args: {
  userMessage?: string
  knowledgeContext?: string
  sentinelProfile?: Record<string, unknown>
}): { system: string; messages: Array<{ role: string; content: string }>; fullAssembled: string } {
  void args.sentinelProfile
  let system = CHAT_SYSTEM_PROMPTS.visitor
  if (args.knowledgeContext?.trim()) {
    system += `\n\n--- RELEVANT KNOWLEDGE BASE ---\n${args.knowledgeContext.trim()}\n--- END KNOWLEDGE BASE ---`
  }
  const messages = [{ role: 'user', content: args.userMessage ?? 'How does booking work?' }]
  return { system, messages, fullAssembled: serializeModelCall({ system, messages }) }
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

export function buildImproveDescriptionUserPrompt(
  body: Record<string, unknown>,
  existingDescription: string,
): string {
  const roomType = String(body.roomType ?? '').trim()
  const suburb = String(body.suburb ?? '').trim()
  const lines: string[] = [
    'You are helping an Australian landlord improve an existing property listing description.',
    'Polish, expand, and improve the following description using the additional property details provided.',
    "Keep the landlord's voice and any specific details they've mentioned.",
    'Use Australian English.',
    'Return only the improved description, no headings or labels.',
    '',
    'Existing description:',
    existingDescription,
    '',
    'Additional property details:',
    `Room type: ${roomType}`,
    `Suburb: ${suburb}`,
  ]

  if (typeof body.weeklyRent === 'number' && Number.isFinite(body.weeklyRent)) {
    lines.push(
      'A weekly rent is set on the listing elsewhere - do not mention rent, bonds, or any dollar amounts in this description.',
    )
  }

  if (isStringArray(body.nearbyUniversities) && body.nearbyUniversities.length > 0) {
    lines.push(`Nearby / associated universities: ${body.nearbyUniversities.join(', ')}`)
  }

  if (isStringArray(body.amenities) && body.amenities.length > 0) {
    lines.push(`Amenities / features: ${body.amenities.join(', ')}`)
  }

  if (typeof body.houseRules === 'string' && body.houseRules.trim()) {
    lines.push(`House rules / expectations: ${body.houseRules.trim()}`)
  }

  if (typeof body.billsIncluded === 'boolean') {
    lines.push(`Bills included: ${body.billsIncluded ? 'yes' : 'no'}`)
  }

  if (typeof body.furnished === 'boolean') {
    lines.push(`Furnished: ${body.furnished ? 'yes' : 'no'}`)
  }

  return lines.join('\n')
}

export function buildDescriptionUserPrompt(body: Record<string, unknown>): string {
  const roomType = String(body.roomType ?? '').trim()
  const suburb = String(body.suburb ?? '').trim()
  const lines: string[] = [
    'Write a property listing description for renters in Australia (students, graduates, and young professionals near campus or work).',
    '',
    'Use only the facts below. Do not invent rooms, facilities, distances, prices, or any other details not listed.',
    '',
    `Room type: ${roomType}`,
    `Suburb: ${suburb}`,
  ]

  if (typeof body.houseRules === 'string' && body.houseRules.trim()) {
    lines.push(`House rules / expectations: ${body.houseRules.trim()}`)
  }

  lines.push(
    '',
    'Requirements:',
    '- 3–4 paragraphs, 120–180 words total.',
    '- Australian English; warm, practical tone.',
    '- Never use em dashes; use commas, full stops, or a simple hyphen with spaces.',
    '- Plain paragraphs only (no bullet lists, no title line).',
  )

  return lines.join('\n')
}

export const DESCRIPTION_GENERATOR_SYSTEM_PROMPT = `You write property listing descriptions for an Australian verified accommodation marketplace.
${NON_DISCRIMINATION_AI_RULE}
${NO_EM_DASH_RULE}
Output plain paragraphs only - no discriminatory tenant preferences.`

export function assembleDescriptionGeneratorModelCall(body: Record<string, unknown>): {
  system: string
  userMessage: string
  fullAssembled: string
} {
  const existingDescription =
    typeof body.existingDescription === 'string' ? body.existingDescription.trim() : ''
  const userMessage = existingDescription
    ? buildImproveDescriptionUserPrompt(body, existingDescription)
    : buildDescriptionUserPrompt(body)
  const system = DESCRIPTION_GENERATOR_SYSTEM_PROMPT
  return {
    system,
    userMessage,
    fullAssembled: serializeModelCall({ system, messages: [{ role: 'user', content: userMessage }] }),
  }
}

export function buildEnquiryReplyUserPrompt(input: {
  studentName: string
  studentMessage: string
  propertyTitle?: string
  propertySuburb?: string
  landlordName?: string
}): string {
  const studentFirstName = toneFirstNameOnly(input.studentName) || 'there'
  const propertyBits = [input.propertyTitle?.trim(), input.propertySuburb?.trim()].filter(Boolean).join(', ')
  const signOffName = toneFirstNameOnly(input.landlordName ?? '') || 'Landlord'

  const lines: string[] = [
    'Write a warm, professional reply from the landlord to the renter.',
    `Address the renter by first name only: ${studentFirstName}`,
    propertyBits ? `Reference this property naturally if relevant: ${propertyBits}` : 'No property details were provided.',
    'Invite the renter to ask further questions or arrange an inspection.',
    'Use Australian English and keep the tone friendly but not overly casual.',
    'Write 3-5 sentences only.',
    'Return only the reply text with no labels, headings, or markdown.',
    '',
    `Landlord first name (sign-off context): ${signOffName}`,
    `Renter enquiry message: ${input.studentMessage}`,
  ]

  return lines.join('\n')
}

export const ENQUIRY_REPLY_SYSTEM_PROMPT = `You draft landlord replies to renter enquiries on an Australian verified accommodation marketplace.
${NON_DISCRIMINATION_AI_RULE}
${NO_EM_DASH_RULE}
Write warm, professional replies only - never express tenant preferences on protected grounds.`

export function assembleEnquiryReplyModelCall(input: {
  studentName: string
  studentMessage: string
  propertyTitle?: string
  propertySuburb?: string
  landlordName?: string
  /** Sentinel profile - must not leak into prompt (API does not load profile). */
  sentinelProfile?: Record<string, unknown>
}): { system: string; userMessage: string; fullAssembled: string } {
  void input.sentinelProfile
  const userMessage = buildEnquiryReplyUserPrompt(input)
  const system = ENQUIRY_REPLY_SYSTEM_PROMPT
  return {
    system,
    userMessage,
    fullAssembled: serializeModelCall({ system, messages: [{ role: 'user', content: userMessage }] }),
  }
}

export function assertNoSentinelsInAssembled(fullAssembled: string, surface: AiSurfaceKey): void {
  for (const sentinel of ALL_AI_SENTINELS) {
    if (fullAssembled.includes(sentinel)) {
      throw new Error(`Sentinel "${sentinel}" leaked in assembled model call for surface "${surface}"`)
    }
  }
}

export const PROOFREAD_SYSTEM_PROMPT = `You are a proofreader for Australian property listing copy written by landlords.

Find and report corrections ONLY for:
- spelling mistakes
- real-word substitution errors (e.g. autocorrect: "Keep" → "Keto", "shut" → "shit")
- clear grammar errors

Rules:
- Preserve the author's voice, casing, punctuation, and enthusiasm.
- Do NOT rewrite, shorten, rephrase, or change meaning.
- Do NOT flag stylistic choices, word preference, or tone.
- Each "original" must be an exact substring of the input text.
- Make each "original" long enough to locate uniquely in the text (include a few surrounding words when the erroneous token alone would be ambiguous).

Output strictly a JSON object with this shape and nothing else:
{ "suggestions": [ { "original": "...", "suggested": "...", "reason": "..." } ] }

No prose, no markdown fences. If there are no errors, return { "suggestions": [] }.`

export function buildProofreadUserPrompt(text: string): string {
  return `Proofread the following text:\n\n${text}`
}
