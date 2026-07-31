import { describe, expect, it } from 'vitest'
import {
  isListYourRoomEGatedPath,
  resolveListYourRoomEEnabled,
} from './listYourRoomEGateCore'

describe('listYourRoomEGateCore', () => {
  it('gates only the E route', () => {
    expect(isListYourRoomEGatedPath('/list-your-room-e')).toBe(true)
    expect(isListYourRoomEGatedPath('/list-your-room-e/')).toBe(true)
    expect(isListYourRoomEGatedPath('/list-your-room-e?source=preview')).toBe(true)
    expect(isListYourRoomEGatedPath('/list-your-room-d')).toBe(false)
    expect(isListYourRoomEGatedPath('/list-your-room')).toBe(false)
  })

  it('defaults on for Preview and Production', () => {
    expect(resolveListYourRoomEEnabled({ vercelEnv: 'preview' })).toBe(true)
    expect(resolveListYourRoomEEnabled({ vercelEnv: 'production' })).toBe(true)
  })

  it('honours explicit overrides', () => {
    expect(resolveListYourRoomEEnabled({ override: 'false', vercelEnv: 'production' })).toBe(false)
    expect(resolveListYourRoomEEnabled({ override: 'true', vercelEnv: 'production' })).toBe(true)
  })
})
