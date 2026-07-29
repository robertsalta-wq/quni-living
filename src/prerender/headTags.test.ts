import { describe, expect, it } from 'vitest'
import { hoistHeadTags } from './headTags'

const WRAPPER_OPEN = '<div class="flex min-h-0 w-full flex-1 flex-col">'

describe('hoistHeadTags', () => {
  it('hoists the leading Helmet tags into head', () => {
    const { head, body } = hoistHeadTags(
      `<title>Quni</title><meta name="description" content="x"/><link rel="canonical" href="/"/>${WRAPPER_OPEN}<header>hi</header></div>`,
    )

    expect(head).toContain('<title>Quni</title>')
    expect(head).toContain('name="description"')
    expect(head).toContain('rel="canonical"')
    expect(body.startsWith(WRAPPER_OPEN)).toBe(true)
  })

  it('leaves the app wrapper markup in the body', () => {
    // Regression: hoisting everything before <header> put the unclosed wrapper <div>
    // into <head>, which closed head early and stranded trailing markup (the floating
    // Ask AI button) outside #root, where it survived as a dead, unclickable copy.
    const { head, body } = hoistHeadTags(
      `<title>Quni</title>${WRAPPER_OPEN}<header>chrome</header><button aria-label="Ask AI">AI</button></div>`,
    )

    expect(head).not.toContain('<div')
    expect(head).not.toContain('<header')
    expect(head).not.toContain('Ask AI')
    expect(body).toContain(WRAPPER_OPEN)
    expect(body).toContain('aria-label="Ask AI"')
  })

  it('hoists leading JSON-LD but not scripts that follow markup', () => {
    const { head, body } = hoistHeadTags(
      `<script type="application/ld+json">{"@type":"Org"}</script>${WRAPPER_OPEN}<script type="application/ld+json">{"@type":"FAQPage"}</script></div>`,
    )

    expect(head).toContain('"@type":"Org"')
    expect(head).not.toContain('FAQPage')
    expect(body).toContain('FAQPage')
  })

  it('returns an empty head when the body starts with markup', () => {
    const { head, body } = hoistHeadTags(`${WRAPPER_OPEN}<header>chrome</header></div>`)

    expect(head).toBe('')
    expect(body).toBe(`${WRAPPER_OPEN}<header>chrome</header></div>`)
  })

  it('strips Suspense boundary comments from the body', () => {
    const { body } = hoistHeadTags(`<!--$--><main>page</main><!--/$-->`)

    expect(body).toBe('<main>page</main>')
  })
})
