import {
  studentLegalName,
  type NameProfile,
} from '../../../src/lib/nameResolution.js'

/** Legacy tenant name expression used on legal surfaces before lock routing. */
export function legacyStudentNameFromProfile(
  p: NameProfile,
  fallback = 'Tenant',
): string {
  const joined =
    [p.first_name, p.last_name].filter(Boolean).join(' ').trim() ||
    (typeof p.full_name === 'string' ? p.full_name.trim() : '')
  return joined || fallback
}

/** Locked legal name when present; otherwise identical to today's inline expression. */
export function tenantLegalNameForDocuments(
  p: NameProfile,
  fallback = 'Tenant',
): string {
  return studentLegalName(p) ?? legacyStudentNameFromProfile(p, fallback)
}
