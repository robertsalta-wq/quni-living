/** Landlord and applicant copy while QLD rooming is classified but Form R18 is not generated. */

export function qldRoomingAcceptGateHeadline(): string {
  return 'Quni cannot generate Form R18 yet'
}

export function qldRoomingAcceptGateParagraphs(): string[] {
  return [
    'This arrangement is rooming accommodation under the Residential Tenancies and Rooming Accommodation Act 2008 (Qld). The prescribed form is Form R18.',
    'Quni does not generate Form R18 yet. You cannot accept this applicant until that form is available.',
    'Do not sign a Form 18a for this listing. Quni will not produce one.',
    'Keep the applicant. You will be able to accept them on this booking when Form R18 ships.',
  ]
}

export function qldRoomingApplyHoldingCopy(): string {
  return 'This is rooming accommodation in Queensland. The provider cannot sign an agreement on Quni until Form R18 is available. You can still apply and wait on this listing.'
}

export function qldOffSiteRoomListingNote(): string {
  return 'In Queensland a private room or shared bedroom with shared facilities is rooming accommodation. The prescribed form is Form R18, which Quni does not generate yet. You can publish this listing and receive applicants. You cannot accept anyone until Form R18 ships. Do not use Form 18a.'
}
