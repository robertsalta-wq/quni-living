/** Landlord-facing copy when a saved column does not match what we wrote. */
export const LISTING_DETAILS_DID_NOT_SAVE_MESSAGE = 'Some listing details did not save. Try again.'

/**
 * Value equality for a column read back after save.
 * Object key order does not matter. Array order does.
 */
export function persistedColumnValuesEqual(expected: unknown, actual: unknown): boolean {
  if (expected === actual) return true
  if (expected == null || actual == null) return expected == null && actual == null
  if (typeof expected !== 'object' || typeof actual !== 'object') return false
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length !== actual.length) return false
    return expected.every((item, index) => persistedColumnValuesEqual(item, actual[index]))
  }
  const expectedRecord = expected as Record<string, unknown>
  const actualRecord = actual as Record<string, unknown>
  const expectedKeys = Object.keys(expectedRecord)
  const actualKeys = Object.keys(actualRecord)
  if (expectedKeys.length !== actualKeys.length) return false
  return expectedKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(actualRecord, key) &&
      persistedColumnValuesEqual(expectedRecord[key], actualRecord[key]),
  )
}

export function findUnpersistedColumn(
  expectedColumns: Record<string, unknown>,
  persisted: Record<string, unknown>,
): { key: string; expected: unknown; actual: unknown } | null {
  for (const [key, expected] of Object.entries(expectedColumns)) {
    const actual = persisted[key] ?? null
    if (!persistedColumnValuesEqual(expected ?? null, actual)) {
      return { key, expected: expected ?? null, actual }
    }
  }
  return null
}
