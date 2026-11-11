import { describe, expect, it, vi } from 'vitest'
import { runSingleFlight } from './singleFlight'

describe('runSingleFlight', () => {
  it('a second tap does nothing until the first call finishes', async () => {
    const flight = { current: false }
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const task = vi.fn(async () => {
      await gate
    })

    const first = runSingleFlight(flight, task)
    const second = runSingleFlight(flight, task)

    expect(task).toHaveBeenCalledTimes(1)
    expect(flight.current).toBe(true)

    release()
    await expect(first).resolves.toBe(true)
    await expect(second).resolves.toBe(false)
    expect(task).toHaveBeenCalledTimes(1)
    expect(flight.current).toBe(false)
  })

  it('allows another call after the first finishes', async () => {
    const flight = { current: false }
    const task = vi.fn(async () => {})
    await expect(runSingleFlight(flight, task)).resolves.toBe(true)
    await expect(runSingleFlight(flight, task)).resolves.toBe(true)
    expect(task).toHaveBeenCalledTimes(2)
  })
})
