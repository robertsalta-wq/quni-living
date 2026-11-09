import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ChatMessageBubble from './ChatMessageBubble'

function htmlFor(role: 'assistant' | 'user', text: string) {
  return renderToStaticMarkup(createElement(ChatMessageBubble, { role, text }))
}

describe('chat message markdown', () => {
  it('renders assistant bold, lists, and https links', () => {
    const html = htmlFor(
      'assistant',
      '**Bold**\n\n- one\n\n[NSW](https://www.nsw.gov.au/housing-and-construction/renting)',
    )
    expect(html).toContain('<strong')
    expect(html).not.toContain('**')
    expect(html).toContain('<li>')
    expect(html).toContain('href="https://www.nsw.gov.au/housing-and-construction/renting"')
  })

  it('does not render raw html or javascript links', () => {
    const script = htmlFor('assistant', '<script>alert(1)</script>')
    expect(script).not.toContain('<script')
    const link = htmlFor('assistant', '[x](javascript:alert(1))')
    expect(link.toLowerCase()).not.toContain('href="javascript:')
    expect(link).not.toContain('<a ')
  })

  it('leaves a visitor message as plain text', () => {
    const html = htmlFor('user', '**not bold**')
    expect(html).toContain('**not bold**')
    expect(html).not.toContain('<strong')
  })
})
