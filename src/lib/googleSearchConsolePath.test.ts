import { describe, expect, it } from 'vitest'
import { classifyPagePath, pageUrlToDisplayPath } from '../../api/lib/googleSearchConsole.js'

describe('pageUrlToDisplayPath', () => {
  it('strips quni.com.au origin', () => {
    expect(pageUrlToDisplayPath('https://quni.com.au/student-accommodation/anu/acton-campus')).toBe(
      '/student-accommodation/anu/acton-campus',
    )
  })

  it('keeps path if already relative', () => {
    expect(pageUrlToDisplayPath('/guides')).toBe('/guides')
  })
})

describe('classifyPagePath', () => {
  it('classifies campus, uni hub, listing', () => {
    expect(classifyPagePath('/student-accommodation/anu/acton-campus')).toBe('campus')
    expect(classifyPagePath('/student-accommodation/anu')).toBe('university')
    expect(classifyPagePath('/listings/foo-bar')).toBe('listing')
    expect(classifyPagePath('/about')).toBe('other')
  })
})
