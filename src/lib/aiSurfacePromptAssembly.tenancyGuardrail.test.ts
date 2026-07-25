import { describe, expect, it } from 'vitest'

import { CHAT_SYSTEM_PROMPTS } from './aiSurfacePromptAssembly'

describe('tenancy-law chat guardrail', () => {
  const personas = ['visitor', 'student_renter', 'landlord'] as const

  for (const persona of personas) {
    it(`${persona} prompt includes tenancy-law attribute-or-decline guardrail`, () => {
      const prompt = CHAT_SYSTEM_PROMPTS[persona]
      expect(prompt).toContain('Tenancy / landlord-law claims')
      expect(prompt).toContain('This is general information, not legal advice')
      expect(prompt).toContain('https://www.nsw.gov.au/housing-and-construction/renting')
      expect(prompt).toContain('https://www.rta.qld.gov.au/')
      expect(prompt).toContain('Queensland hosted-room')
      expect(prompt).toContain('Product carve-out')
    })
  }
})
