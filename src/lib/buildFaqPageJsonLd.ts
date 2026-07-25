/** Shared FAQPage JSON-LD for guides, /faq, /pricing, and similar. */

export type FaqPlainPair = {
  question: string
  answer: string
}

export function buildFaqPageJsonLd(faqs: FaqPlainPair[]): Record<string, unknown> | null {
  const pairs = faqs
    .map((f) => ({
      question: f.question.trim(),
      answer: f.answer.trim(),
    }))
    .filter((f) => f.question.length > 0 && f.answer.length > 0)

  if (pairs.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  }
}
