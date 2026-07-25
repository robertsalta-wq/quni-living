import { describe, expect, it } from 'vitest'
import { buildFaqPageJsonLd } from './buildFaqPageJsonLd'

describe('buildFaqPageJsonLd', () => {
  it('returns null for empty input', () => {
    expect(buildFaqPageJsonLd([])).toBeNull()
  })

  it('builds FAQPage mainEntity from plain pairs', () => {
    const ld = buildFaqPageJsonLd([
      { question: 'Is Quni free for renters?', answer: 'Yes. Renters pay no platform fees to Quni.' },
    ])
    expect(ld).toMatchObject({
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is Quni free for renters?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Renters pay no platform fees to Quni.',
          },
        },
      ],
    })
  })
})
