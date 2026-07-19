import { describe, expect, it } from 'vitest'
import {
  appChromeActionsSignature,
  type AppActionBarItem,
} from '../components/appShell/AppChromeActionsContext'

describe('appChromeActionsSignature', () => {
  it('ignores onClick identity (prevents React #185 from fresh closures each render)', () => {
    const a: AppActionBarItem[] = [{ id: 'save', label: 'Save', primary: true, onClick: () => {} }]
    const b: AppActionBarItem[] = [{ id: 'save', label: 'Save', primary: true, onClick: () => {} }]
    expect(appChromeActionsSignature(a)).toBe(appChromeActionsSignature(b))
    expect(appChromeActionsSignature(a)).toBe(appChromeActionsSignature(a))
  })

  it('changes when label, to, or flags change', () => {
    const base: AppActionBarItem[] = [{ id: 'preview', label: 'Preview', to: '/a' }]
    expect(appChromeActionsSignature(base)).not.toBe(
      appChromeActionsSignature([{ id: 'preview', label: 'Preview', to: '/b' }]),
    )
    expect(appChromeActionsSignature(base)).not.toBe(
      appChromeActionsSignature([{ id: 'preview', label: 'Preview', to: '/a', active: true }]),
    )
  })

  it('returns null for opt-out', () => {
    expect(appChromeActionsSignature(null)).toBeNull()
  })
})
