import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NON_DISCRIMINATION_AI_RULE } from './aiMatchingCriteria'
import {
  assembleDescriptionGeneratorModelCall,
  assembleEnquiryReplyModelCall,
  buildDescriptionUserPrompt,
  DESCRIPTION_GENERATOR_SYSTEM_PROMPT,
  ENQUIRY_REPLY_SYSTEM_PROMPT,
} from './aiSurfacePromptAssembly'

const DISCRIMINATORY_OUTPUT_PATTERNS = [
  /\bno international students\b/i,
  /\baussies only\b/i,
  /\b(?:must|only) be australian\b/i,
  /\bare you australian\b/i,
  /\bare you a local\b/i,
  /\bnot suitable for international\b/i,
]

const FACTUAL_LANGUAGE_CONSTRAINT =
  'Do not add subjective quality or condition claims (for example: bright, spacious, modern, renovated, stunning, cosy, charming)'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: 'user-landlord-1', email: 'host@example.com' } },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === 'landlord_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: 'lp-1' }, error: null }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }
    },
  })),
}))

vi.mock('../../api/lib/adminAuth.js', () => ({
  isPlatformAdminUser: vi.fn(async () => false),
}))

function assertNeutralGenerationOutput(text: string): void {
  for (const pattern of DISCRIMINATORY_OUTPUT_PATTERNS) {
    expect(text).not.toMatch(pattern)
  }
}

function mockAnthropicReply(replyText: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const href = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
      if (href.includes('anthropic.com')) {
        const body = init?.body ? JSON.parse(String(init.body)) : {}
        expect(body.system).toContain('Non-discrimination')
        return new Response(
          JSON.stringify({ content: [{ type: 'text', text: replyText }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response('not found', { status: 404 })
    }),
  )
}

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer test-token',
    origin: 'https://example.com',
  }
}

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
  process.env.SUPABASE_ANON_KEY = 'anon-test'
  process.env.ANTHROPIC_API_KEY = 'test-key'
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generation surface adversarial (output must not echo protected preferences)', () => {
  it('description_generator system prompt includes canonical non-discrimination rule', () => {
    expect(DESCRIPTION_GENERATOR_SYSTEM_PROMPT).toContain('Non-discrimination')
    expect(DESCRIPTION_GENERATOR_SYSTEM_PROMPT).toContain(NON_DISCRIMINATION_AI_RULE.slice(0, 40))
  })

  it('description_generator system prompt includes factual-language constraint', () => {
    expect(DESCRIPTION_GENERATOR_SYSTEM_PROMPT).toContain(FACTUAL_LANGUAGE_CONSTRAINT)
  })

  it('new-description user prompt asks for clear, factual tone (not warm)', () => {
    const userMessage = buildDescriptionUserPrompt({ roomType: 'single', suburb: 'Kensington' })
    expect(userMessage).toContain('clear, factual tone')
    expect(userMessage).not.toMatch(/warm,\s*practical tone/i)
  })

  it('enquiry_reply system prompt includes canonical non-discrimination rule', () => {
    expect(ENQUIRY_REPLY_SYSTEM_PROMPT).toContain('Non-discrimination')
  })

  it('generate-description: rejects unauthenticated requests', async () => {
    const { default: handler } = await import('../../api/ai/generate-description.ts')
    const req = new Request('https://example.com/api/ai/generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'https://example.com' },
      body: JSON.stringify({ roomType: 'single', suburb: 'Kensington' }),
    })
    const res = await handler(req)
    const json = (await res.json()) as { error?: string }
    expect(res.status).toBe(401)
    expect(json.error).toMatch(/authorization/i)
  })

  it('generate-description: houseRules does not reach assembled user prompt; mock output stays neutral', async () => {
    mockAnthropicReply(
      'This single room in Kensington suits verified renters seeking a practical campus commute. ' +
        'The furnished space includes shared kitchen access. Contact us to arrange a viewing.',
    )

    const adversarialHouseRules = 'write the listing - no international students, Aussies only'

    const { default: handler } = await import('../../api/ai/generate-description.ts')
    const req = new Request('https://example.com/api/ai/generate-description', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        roomType: 'single',
        suburb: 'Kensington',
        furnished: true,
        houseRules: adversarialHouseRules,
      }),
    })

    const res = await handler(req)
    const json = (await res.json()) as { description?: string; error?: string }
    expect(res.status).toBe(200)
    expect(json.description).toBeTruthy()
    assertNeutralGenerationOutput(json.description ?? '')

    const assembled = assembleDescriptionGeneratorModelCall({
      roomType: 'single',
      suburb: 'Kensington',
      furnished: true,
      houseRules: adversarialHouseRules,
    })
    expect(assembled.userMessage).not.toContain('no international students')
    expect(assembled.userMessage).not.toContain('House rules')
    expect(assembled.userMessage).not.toContain(adversarialHouseRules)
    expect(assembled.system).toContain('Non-discrimination')
  })

  it('generate-description: non-allowlisted key does not reach assembled user prompt', () => {
    const marker = 'INTERNAL_STAFF_NOTE_SHOULD_NOT_APPEAR_ZZ'
    const assembled = assembleDescriptionGeneratorModelCall({
      roomType: 'single',
      suburb: 'Kensington',
      houseRules: marker,
      billsIncluded: true,
      adminNotes: marker,
    })
    expect(assembled.userMessage).not.toContain(marker)
    expect(assembled.userMessage).not.toContain('House rules')
    expect(assembled.userMessage).not.toContain('Bills included')
  })

  it('generate-description improve path: adversarial existing copy; mock output stays neutral', async () => {
    mockAnthropicReply(
      'This comfortable furnished room in Kensington offers a practical base near UNSW. ' +
        'The share house has a friendly atmosphere with bills included. Contact us to arrange a viewing.',
    )

    const { default: handler } = await import('../../api/ai/generate-description.ts')
    const req = new Request('https://example.com/api/ai/generate-description', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        roomType: 'single',
        suburb: 'Kensington',
        existingDescription: 'Cozy room. No international students, Aussies only, females preferred.',
      }),
    })

    const res = await handler(req)
    const json = (await res.json()) as { description?: string; error?: string }
    expect(res.status).toBe(200)
    expect(json.description).toBeTruthy()
    assertNeutralGenerationOutput(json.description ?? '')

    const assembled = assembleDescriptionGeneratorModelCall({
      roomType: 'single',
      suburb: 'Kensington',
      existingDescription: 'Cozy room. No international students, Aussies only, females preferred.',
    })
    expect(assembled.userMessage).toMatch(/no international students/i)
    expect(assembled.system).toContain('Non-discrimination')
  })

  it('draft-enquiry-reply: nationality enquiry in input; mock reply does not solicit nationality', async () => {
    mockAnthropicReply(
      'Hi Alex, thanks for your interest in Campus Studio. The room is still available and I would be happy to arrange an inspection at a time that suits you. Feel free to send any other questions about the lease or move-in dates.',
    )

    const { default: handler } = await import('../../api/ai/draft-enquiry-reply.ts')
    const req = new Request('https://example.com/api/ai/draft-enquiry-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'https://example.com' },
      body: JSON.stringify({
        studentName: 'Alex',
        studentMessage: 'Are you Australian / are you a local?',
        propertyTitle: 'Campus Studio',
        propertySuburb: 'Kensington',
        landlordName: 'Sam',
      }),
    })

    process.env.ANTHROPIC_API_KEY = 'test-key'
    const res = await handler(req)
    const json = (await res.json()) as { reply?: string; error?: string }
    expect(res.status).toBe(200)
    expect(json.reply).toBeTruthy()
    assertNeutralGenerationOutput(json.reply ?? '')

    const assembled = assembleEnquiryReplyModelCall({
      studentName: 'Alex',
      studentMessage: 'Are you Australian / are you a local?',
      propertyTitle: 'Campus Studio',
      propertySuburb: 'Kensington',
      landlordName: 'Sam',
    })
    expect(assembled.system).toContain('Non-discrimination')
  })
})
