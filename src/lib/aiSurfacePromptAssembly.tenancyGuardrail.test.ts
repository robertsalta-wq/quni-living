import { describe, expect, it } from 'vitest'

import { CHAT_SYSTEM_PROMPTS } from './aiSurfacePromptAssembly'

describe('tenancy-law chat guardrail', () => {
  const personas = ['visitor', 'student_renter', 'landlord'] as const

  for (const persona of personas) {
    it(`${persona} prompt includes recite-or-refer tenancy-law guardrail`, () => {
      const prompt = CHAT_SYSTEM_PROMPTS[persona]
      expect(prompt).toContain('Tenancy / landlord-law claims')
      expect(prompt).toContain('recite or refer')
      expect(prompt).toContain('Branch 1 — attributable source present')
      expect(prompt).toContain('Branch 2 — no attributable source')
      expect(prompt).toContain('seek legal advice')
      expect(prompt).toContain('This is general information, not legal advice')
      expect(prompt).toContain('https://www.nsw.gov.au/housing-and-construction/renting')
      expect(prompt).toContain('https://www.rta.qld.gov.au/')
      expect(prompt).toContain('Product carve-out')
      expect(prompt).toContain('lodger vs tenant')
    })
  }
})
