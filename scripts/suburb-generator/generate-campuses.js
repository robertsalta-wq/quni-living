/**
 * Campus SEO content generator (pilot).
 * Writes content/campuses/{universitySlug}/{campusSlug}.json
 * using the same content object shape as generate.js suburb mode.
 *
 * Usage:
 *   node scripts/suburb-generator/generate-campuses.js --only=unsw/kensington-campus
 *   npm run generate:campuses -- --only=unsw/kensington-campus
 *
 * Does not break npm run generate:suburbs.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.join(__dirname, '.env') })

const anthropicApiKey = process.env.ANTHROPIC_API_KEY
if (!anthropicApiKey) {
  console.error('Missing ANTHROPIC_API_KEY in scripts/suburb-generator/.env')
  process.exit(1)
}

const anthropic = new Anthropic({ apiKey: anthropicApiKey })

/**
 * Colloquial/former suburb names to weave into body + FAQ when present.
 * Do not invent beyond this map.
 */
const COLLOQUIAL_SUBURB_NOTES = {
  'mq/macquarie-park-campus':
    'Macquarie Park was formerly part of North Ryde; students still often say North Ryde for this area.',
  'usyd/camperdown-darlington-campus':
    'Camperdown/Darlington is commonly referred to as Newtown by students looking nearby.',
}

/**
 * Verified campus-specific facts the model MUST use when present.
 * Only include facts we are willing to publish; do not invent here.
 */
const VERIFIED_CAMPUS_FACTS = {
  'unsw/kensington-campus': [
    'The L3 Kingsford light rail line runs along Anzac Parade with a stop serving UNSW.',
    'Anzac Parade is the main commercial strip through Kensington and Kingsford beside campus.',
    'Neighbouring suburbs commonly used by UNSW students include Kingsford, Randwick, and Maroubra.',
    'Centennial Park sits west of Kensington; Coogee and Maroubra beaches sit east/southeast.',
  ],
}

/** Pilot campuses — inputs from prod (do not invent transport/rent figures). */
const PILOT_CAMPUSES = [
  {
    universitySlug: 'unsw',
    campusSlug: 'kensington-campus',
    campusName: 'Kensington Campus',
    universityName: 'University of New South Wales',
    shortName: 'UNSW',
    suburb: 'Kensington',
    state: 'NSW',
    latitude: -33.9173,
    longitude: 151.2313,
  },
  {
    universitySlug: 'usyd',
    campusSlug: 'camperdown-darlington-campus',
    campusName: 'Camperdown/Darlington Campus',
    universityName: 'University of Sydney',
    shortName: 'USYD',
    suburb: 'Camperdown',
    state: 'NSW',
    latitude: null,
    longitude: null,
  },
  {
    universitySlug: 'uts',
    campusSlug: 'city-campus',
    campusName: 'City Campus',
    universityName: 'University of Technology Sydney',
    shortName: 'UTS',
    suburb: 'Ultimo',
    state: 'NSW',
    latitude: null,
    longitude: null,
  },
  {
    universitySlug: 'mq',
    campusSlug: 'macquarie-park-campus',
    campusName: 'Macquarie Park Campus',
    universityName: 'Macquarie University',
    shortName: 'MQ',
    suburb: 'Macquarie Park',
    state: 'NSW',
    latitude: null,
    longitude: null,
  },
  {
    universitySlug: 'wsu',
    campusSlug: 'parramatta-campus',
    campusName: 'Parramatta Campus',
    universityName: 'Western Sydney University',
    shortName: 'WSU',
    suburb: 'Parramatta',
    state: 'NSW',
    latitude: null,
    longitude: null,
  },
]

function parseOnlyFlag(argv) {
  const raw = argv.find((a) => a.startsWith('--only='))
  if (!raw) return null
  return raw.slice('--only='.length).trim().toLowerCase()
}

function createCampusPrompt(campus) {
  const key = `${campus.universitySlug}/${campus.campusSlug}`
  const colloquial = COLLOQUIAL_SUBURB_NOTES[key] ?? null
  const verifiedFacts = VERIFIED_CAMPUS_FACTS[key] ?? []
  const coords =
    campus.latitude != null && campus.longitude != null
      ? `${campus.latitude}, ${campus.longitude}`
      : 'not provided'

  const primaryAnchor = `Student Accommodation near ${campus.shortName}, ${campus.suburb}`

  return `You are writing high-quality, locally specific, SEO landing page copy for Quni Living (Australian student accommodation marketplace — private per-room student housing, not purpose-built halls).

Return ONLY valid JSON. Do not include markdown, prose, or code fences.

Primary search anchor (use in metaTitle, h1, and FAQ questions): "${primaryAnchor}"
University short name: ${campus.shortName}
University full name: ${campus.universityName}
Campus name (secondary — do not lead with this in titles/H1): ${campus.campusName}
Suburb: ${campus.suburb}
State: ${campus.state}
Coordinates (context only): ${coords}

Search anchoring rules:
- metaTitle, h1, and FAQ questions must lead with university short_name + suburb (e.g. "${primaryAnchor}").
- Campus name is secondary — mention in intro/body where natural, not as the primary phrase.
- Example good title shape: "Student Accommodation near UTS, Ultimo" — not "near City Campus".
- metaTitle must NOT include a brand suffix. Do not append "| Quni Living" or "| Quni". The site layer adds the brand.

Specificity over hedging (mandatory):
- Every section body (intro, livingSection.body, transportSection.body, costSection.body) and each tip must contain at least two facts that are true of THIS campus/suburb and would be false or misleading for a random other Australian campus — named streets, named stops, named neighbouring suburbs, named landmarks, or walking/adjacency relationships you can state without inventing numbers.
- "Well connected by bus services" / "public transport options" / "nearby amenities" without names is filler. Do not write filler.
- If a concrete fact is verifiable and listed below, state it plainly. Do not hedge a true fact into vagueness.
- Accuracy still binds: do NOT invent route numbers, travel times, rent dollar figures, or stops/landmarks not listed or not genuinely known.

Verified facts you MUST incorporate for this campus (state plainly; name the light rail line where listed):
${
  verifiedFacts.length
    ? verifiedFacts.map((f) => `- ${f}`).join('\n')
    : '- (none supplied — only use facts you are certain are accurate; prefer omitting over inventing)'
}

Colloquial / former suburb names:
${
  colloquial
    ? `- Work this naturally into body copy and at least one FAQ (one or two mentions, no stuffing): ${colloquial}`
    : '- No colloquial/former suburb note applies for this campus. Do not invent alternative suburb names.'
}

Cost section (rewrite — do NOT write "prices vary, browse listings"):
- Explain structural differences students face: room in a share house vs studio vs one-bedroom.
- What is typically bundled into rent versus billed separately (utilities, internet, furnishings).
- How bond and upfront costs work in ${campus.state} for residential tenancies / share arrangements at a high level (qualitative; no invented dollar figures).
- Why per-room lets price differently from whole-property leases.
- Qualitative but concrete. Zero invented rent or bond dollar amounts.

Factual accuracy (mandatory — licensed real estate business, public-facing):
- Do NOT invent train/bus route numbers, travel times, or rent/bond dollar figures.
- Write clear natural Australian English. No placeholders. No keyword stuffing.

Return this exact JSON structure with all keys present:
{
  "metaTitle": "string",
  "metaDescription": "string",
  "h1": "string",
  "intro": "string",
  "livingSection": { "heading": "string", "body": "string" },
  "transportSection": { "heading": "string", "body": "string" },
  "costSection": { "heading": "string", "body": "string" },
  "tipsSection": { "heading": "string", "tips": ["string", "string", "string"] },
  "faqs": [
    { "question": "string", "answer": "string" },
    { "question": "string", "answer": "string" },
    { "question": "string", "answer": "string" }
  ],
  "ctaText": "string"
}`
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function is529OverloadedError(error) {
  if (!error || typeof error !== 'object') return false
  const status = error.status ?? error.statusCode ?? error.code
  if (status === 529 || status === '529') return true
  const message = error instanceof Error ? error.message : String(error)
  return /\b529\b/.test(message) && /overload|overloaded/i.test(message)
}

async function generateCampusContent(campus) {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: createCampusPrompt(campus) }],
  })

  const textBlock = message.content.find((block) => block.type === 'text')
  if (!textBlock) {
    throw new Error('Claude response missing text block')
  }

  const raw = textBlock.text.trim()
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const jsonText = (fenced ? fenced[1] : raw).trim()
  try {
    const parsed = JSON.parse(jsonText)
    if (parsed && typeof parsed.metaTitle === 'string') {
      parsed.metaTitle = stripBrandSuffix(parsed.metaTitle)
    }
    return parsed
  } catch {
    throw new Error(`Claude returned non-JSON content: ${raw.slice(0, 200)}`)
  }
}

function stripBrandSuffix(title) {
  return title
    .replace(/\s*[|–—-]\s*Quni(?:\s+Living)?\s*$/i, '')
    .trim()
}

async function generateWithRetry(campus) {
  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await generateCampusContent(campus)
    } catch (error) {
      if (!is529OverloadedError(error) || attempt === maxAttempts) throw error
      console.log(`Retrying ${campus.campusSlug} (attempt ${attempt + 1}/${maxAttempts})...`)
      await sleep(15000)
    }
  }
  throw new Error(`Unexpected retry failure for ${campus.campusSlug}`)
}

async function run() {
  const only = parseOnlyFlag(process.argv.slice(2))
  if (!only) {
    console.error('Refusing to run without --only=universitySlug/campusSlug (pilot safety).')
    console.error('Example: npm run generate:campuses -- --only=unsw/kensington-campus')
    process.exit(1)
  }

  const campuses = PILOT_CAMPUSES.filter(
    (c) => `${c.universitySlug}/${c.campusSlug}`.toLowerCase() === only,
  )
  if (campuses.length === 0) {
    console.error(`No pilot campus matches --only=${only}`)
    process.exit(1)
  }

  console.log(`Campus SEO generation (only=${only})\n`)

  for (const campus of campuses) {
    const label = `${campus.shortName} / ${campus.suburb} (${campus.campusSlug})`
    console.log(`Generating: ${label}`)

    const copy = await generateWithRetry(campus)
    const content = {
      campus: {
        name: campus.campusName,
        suburb: campus.suburb,
        state: campus.state,
        universityName: campus.universityName,
        universityShortName: campus.shortName,
        universitySlug: campus.universitySlug,
        campusSlug: campus.campusSlug,
      },
      ...copy,
    }
    const outDir = path.join(repoRoot, 'content', 'campuses', campus.universitySlug)
    await fs.mkdir(outDir, { recursive: true })
    const outPath = path.join(outDir, `${campus.campusSlug}.json`)
    await fs.writeFile(outPath, `${JSON.stringify(content, null, 2)}\n`, 'utf8')
    console.log(`Saved: ${path.relative(repoRoot, outPath)}`)
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Fatal: ${message}`)
  process.exit(1)
})
