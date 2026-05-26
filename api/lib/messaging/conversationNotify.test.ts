import { describe, expect, it } from 'vitest'
import {
  buildNewMessageNotificationHtml,
  buildNewMessageNotificationSubject,
} from './conversationNotify.js'

describe('conversationNotify email', () => {
  it('subject includes property title only', () => {
    expect(buildNewMessageNotificationSubject('Casa Malvina')).toBe('New message about Casa Malvina')
  })

  it('html contains title, first name, and deep link — no message body', () => {
    const secretBody = '0412 345 678 call me at leak@example.com'
    const html = buildNewMessageNotificationHtml({
      propertyTitle: 'Casa Malvina',
      senderFirstName: 'Quinn',
      conversationId: '11111111-1111-1111-1111-111111111111',
    })

    expect(html).toContain('Casa Malvina')
    expect(html).toContain('Quinn')
    expect(html).toContain('/messages/11111111-1111-1111-1111-111111111111')
    expect(html).toContain('Open conversation')
    expect(html).not.toContain(secretBody)
    expect(html).not.toContain('0412')
    expect(html).not.toContain('leak@example.com')
    expect(html).not.toContain('<pre')
  })
})
