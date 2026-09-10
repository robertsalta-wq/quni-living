/** Landlord and applicant copy while QLD rooming Form R18 is produced but accept is not open. */

export function qldRoomingAcceptGateHeadline(): string {
  return 'You cannot accept this applicant yet'
}

export function qldRoomingAcceptGateParagraphs(): string[] {
  return [
    'This arrangement is rooming accommodation under the Residential Tenancies and Rooming Accommodation Act 2008 (Qld). The prescribed form is Form R18.',
    'Quni produces Form R18. You cannot accept this applicant on Quni yet.',
    'Do not sign a Form 18a for this listing. Quni will not produce one.',
    'Keep the applicant. Accept will open on this booking in a later release.',
  ]
}

export function qldRoomingApplyHoldingCopy(): string {
  return 'This is rooming accommodation in Queensland. Quni produces Form R18. The provider cannot accept you on Quni yet. You can still apply and wait on this listing.'
}

export function qldOffSiteRoomListingNote(): string {
  return 'In Queensland a private room or shared bedroom with shared facilities is rooming accommodation. The prescribed form is Form R18. You can publish this listing and receive applicants. You cannot accept anyone on Quni yet. Do not use Form 18a.'
}
