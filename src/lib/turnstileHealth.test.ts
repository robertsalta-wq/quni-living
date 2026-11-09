import { describe, expect, it } from 'vitest'

import { isTurnstileConfigError, turnstileAlertDue, turnstileReportPage } from './turnstileHealth'

describe('turnstile health', () => {
  it('alerts only on widget configuration errors', () => {
    expect(isTurnstileConfigError('110200')).toBe(true)
    expect(isTurnstileConfigError('110100')).toBe(true)
    expect(isTurnstileConfigError('110110')).toBe(true)
    expect(isTurnstileConfigError('400020')).toBe(true)
    expect(isTurnstileConfigError('600010')).toBe(false)
    expect(isTurnstileConfigError('110600')).toBe(false)
    expect(isTurnstileConfigError(undefined)).toBe(false)
  })

  it('keeps a same-code alert quiet for a day', () => {
    const now = Date.parse('2026-11-09T00:00:00.000Z')
    const recent = {
      status: 'down',
      message: '110200',
      checked_at: '2026-11-08T12:00:00.000Z',
    }
    expect(turnstileAlertDue(recent, '110200', now)).toBe(false)
    expect(turnstileAlertDue(recent, '110100', now)).toBe(true)
    expect(turnstileAlertDue(null, '110200', now)).toBe(true)
    expect(
      turnstileAlertDue(
        { status: 'down', message: '110200', checked_at: '2026-11-07T00:00:00.000Z' },
        '110200',
        now,
      ),
    ).toBe(true)
  })

  it('keeps the reported page to a path', () => {
    expect(turnstileReportPage('/contact?x=1')).toBe('/contact')
    expect(turnstileReportPage('https://evil.example/contact')).toBe('/')
    expect(turnstileReportPage('//evil.example')).toBe('/')
  })
})
