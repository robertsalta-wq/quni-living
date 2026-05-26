import { describe, expect, it } from 'vitest'
import { MASK_REPLACEMENT, maskContactInfo } from './maskContactInfo'

describe('maskContactInfo', () => {
  it('masks standard AU mobile with spaces', () => {
    const r = maskContactInfo('Call me on 0412 345 678 thanks')
    expect(r.maskedBody).toContain(MASK_REPLACEMENT)
    expect(r.maskedBody).not.toContain('0412')
    expect(r.matches.some((m) => m.maskType === 'phone')).toBe(true)
  })

  it('masks +61 format', () => {
    const r = maskContactInfo('Reach +61 412 345 678')
    expect(r.maskedBody).not.toMatch(/412\s*345/)
    expect(r.matches.some((m) => m.maskType === 'phone')).toBe(true)
  })

  it('masks compact 04xxxxxxxx', () => {
    const r = maskContactInfo('txt 0412345678 pls')
    expect(r.maskedBody).not.toContain('0412345678')
  })

  it('masks landline 02', () => {
    const r = maskContactInfo('office 02 9876 5432')
    expect(r.maskedBody).toContain(MASK_REPLACEMENT)
  })

  it('masks spelled-out mobile digits', () => {
    const r = maskContactInfo(
      'zero four one two three four five six seven eight is my number',
    )
    expect(r.maskedBody).toContain(MASK_REPLACEMENT)
    expect(r.matches.some((m) => m.maskType === 'phone')).toBe(true)
  })

  it('masks spelled digits with "and"', () => {
    const r = maskContactInfo(
      'oh four one two and three four five six and seven eight',
    )
    expect(r.maskedBody).toContain(MASK_REPLACEMENT)
  })

  it('masks email addresses', () => {
    const r = maskContactInfo('email me at quinn.test+tag@quni.com.au')
    expect(r.maskedBody).not.toContain('@quni.com.au')
    expect(r.matches.some((m) => m.maskType === 'email')).toBe(true)
  })

  it('masks https URLs', () => {
    const r = maskContactInfo('see https://example.com/listing?id=1')
    expect(r.maskedBody).not.toContain('https://')
    expect(r.matches.some((m) => m.maskType === 'url')).toBe(true)
  })

  it('masks www URLs', () => {
    const r = maskContactInfo('visit www.instagram.com/myhandle')
    expect(r.matches.length).toBeGreaterThan(0)
  })

  it('masks @username handles', () => {
    const r = maskContactInfo('follow @student_renter_99')
    expect(r.maskedBody).not.toContain('@student')
    expect(r.matches.some((m) => m.maskType === 'social')).toBe(true)
  })

  it('masks wa.me links', () => {
    const r = maskContactInfo('chat wa.me/61412345678')
    expect(r.maskedBody).not.toContain('wa.me')
  })

  it('masks t.me links', () => {
    const r = maskContactInfo('telegram t.me/quni_support')
    expect(r.maskedBody).not.toContain('t.me')
  })

  it('masks instagram.com paths', () => {
    const r = maskContactInfo('insta instagram.com/secret.user')
    expect(r.maskedBody).not.toContain('instagram.com')
  })

  it('masks "find me on whatsapp"', () => {
    const r = maskContactInfo('find me on whatsapp')
    expect(r.matches.some((m) => m.maskType === 'social')).toBe(true)
  })

  it('masks signal / telegram shorthand', () => {
    const r = maskContactInfo('message me signal: @renter42')
    expect(r.maskedBody).toContain(MASK_REPLACEMENT)
  })

  it('masks multiple hits in one message', () => {
    const r = maskContactInfo('0412 345 678 or hello@home.com or @renter')
    expect(r.matches.length).toBeGreaterThanOrEqual(3)
    expect(r.maskedBody).not.toContain('hello@home.com')
  })

  it('leaves benign text unchanged', () => {
    const text = 'Is the room still available for Semester 2?'
    const r = maskContactInfo(text)
    expect(r.maskedBody).toBe(text)
    expect(r.matches).toHaveLength(0)
  })

  it('does not mask short digit sequences', () => {
    const r = maskContactInfo('I need 2 bedrooms for 4 people')
    expect(r.matches.filter((m) => m.maskType === 'phone')).toHaveLength(0)
  })

  it('masks gmail with dots', () => {
    const r = maskContactInfo('reach.first.last@gmail.com')
    expect(r.maskedBody).not.toContain('gmail.com')
  })

  it('masks facebook.com profile URLs', () => {
    const r = maskContactInfo('fb facebook.com/marketplace/item/123')
    expect(r.maskedBody).toContain(MASK_REPLACEMENT)
  })

  it('masks international +61 without spaces', () => {
    const r = maskContactInfo('+61412345678')
    expect(r.maskedBody).not.toContain('+614')
  })
})
