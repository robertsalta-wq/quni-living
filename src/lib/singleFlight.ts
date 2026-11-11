/**
 * One in-flight action per ref. The flag is set before `task` starts, so a second
 * call in the same turn does nothing until the first call finishes.
 */
export async function runSingleFlight(
  flight: { current: boolean },
  task: () => Promise<void>,
): Promise<boolean> {
  if (flight.current) return false
  flight.current = true
  try {
    await task()
    return true
  } finally {
    flight.current = false
  }
}
