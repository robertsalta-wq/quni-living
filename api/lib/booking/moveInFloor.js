/** @param {string | null | undefined} v */
function normalizeListingBound(v) {
  if (v == null) return null
  const day = String(v).trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const [y, m, d] = day.split('-').map(Number)
  const norm = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const check = new Date(Date.UTC(y, m - 1, d))
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return null
  }
  return norm
}

function todayUtcIso() {
  return new Date().toISOString().slice(0, 10)
}

/** Earliest allowed move-in: max(available_from, today). No lead-time buffer. */
export function earliestSelectableMoveInIso(availableFrom) {
  const today = todayUtcIso()
  const from = normalizeListingBound(availableFrom)
  if (from && from > today) return from
  return today
}

/**
 * @param {string} moveInDate YYYY-MM-DD
 * @param {string | null | undefined} availableFrom
 * @returns {string | null} error message when move-in is before the floor
 */
export function moveInFloorError(moveInDate, availableFrom) {
  const moveIn = typeof moveInDate === 'string' ? moveInDate.trim().slice(0, 10) : ''
  if (!moveIn) return 'Move-in date is required'
  const floor = earliestSelectableMoveInIso(availableFrom)
  if (moveIn >= floor) return null
  const from = normalizeListingBound(availableFrom)
  if (from && from > todayUtcIso()) {
    return `Move-in date cannot be before ${from}`
  }
  return 'Move-in date cannot be in the past'
}
