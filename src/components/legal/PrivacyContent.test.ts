import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PrivacyContent } from './PrivacyContent'

const OVERSEAS_LINE = 'that address is sent to Google LLC and may be processed in the United States'

describe('PrivacyContent overseas address disclosure', () => {
  it('names Google LLC and the United States in section 5.2 and the overseas disclosure', () => {
    const html = renderToStaticMarkup(createElement(PrivacyContent))
    expect(html).toContain('id="disclosure-providers"')
    expect(html).toContain('5.2 To Service Providers')
    expect(html).toContain('id="disclosure-overseas"')
    expect(html).toContain('5.5 Overseas disclosure')
    const mentions = html.split(OVERSEAS_LINE).length - 1
    expect(mentions).toBe(2)
  })
})
