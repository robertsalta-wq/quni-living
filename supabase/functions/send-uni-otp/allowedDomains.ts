/** Mirror src/lib/uniEmailDomains.ts BASE_DOMAINS — update both when changing. */
export const BASE_DOMAINS = [
  'sydney.edu.au',
  'unsw.edu.au',
  'uts.edu.au',
  'mq.edu.au',
  'westernsydney.edu.au',
  'newcastle.edu.au',
  'uon.edu.au',
  'uow.edu.au',
  'scu.edu.au',
  'csu.edu.au',
  'unimelb.edu.au',
  'monash.edu',
  'monash.edu.au',
  'rmit.edu.au',
  'deakin.edu.au',
  'latrobe.edu.au',
  'swin.edu.au',
  'swinburne.edu.au',
  'vu.edu.au',
  'federation.edu.au',
  'uq.edu.au',
  'qut.edu.au',
  'griffith.edu.au',
  'jcu.edu.au',
  'usq.edu.au',
  'bond.edu.au',
  'cqu.edu.au',
  'uwa.edu.au',
  'curtin.edu.au',
  'murdoch.edu.au',
  'ecu.edu.au',
  'nd.edu.au',
  'adelaide.edu.au',
  'unisa.edu.au',
  'flinders.edu.au',
  'anu.edu.au',
  'canberra.edu.au',
  'utas.edu.au',
  'cdu.edu.au',
  'acu.edu.au',
] as const

export function isAllowedUniEmailDomain(hostRaw: string): boolean {
  const host = hostRaw.trim().toLowerCase()
  if (!host || host.includes('..') || host.startsWith('.') || host.endsWith('.')) return false
  for (const base of BASE_DOMAINS) {
    if (host === base || host.endsWith('.' + base)) return true
  }
  return false
}

export function parseEmailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at < 1 || at === trimmed.length - 1) return null
  return trimmed.slice(at + 1)
}
