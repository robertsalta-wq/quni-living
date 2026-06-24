import type { RenterSituation } from './renterSituation'

/** Situations that show a verifiable email row in §02 Verification. */
export function situationShowsVerificationEmail(situation: RenterSituation): boolean {
  return situation === 'student' || situation === 'working'
}

export function verificationEmailFieldLabel(situation: RenterSituation): string {
  return situation === 'student' ? 'University email' : 'Work email'
}
