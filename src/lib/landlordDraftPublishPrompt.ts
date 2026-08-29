export function countDraftListingsWaiting(
  listings: Array<{ status: string | null | undefined }>,
): number {
  return listings.filter((l) => l.status === 'draft').length
}

export type LandlordDraftPublishPromptCopy = {
  title: string
  body: string
  actionLabel: string
}

export function landlordDraftPublishPromptCopy(
  draftCount: number,
): LandlordDraftPublishPromptCopy | null {
  if (draftCount < 1) return null
  if (draftCount === 1) {
    return {
      title: 'Listing waiting to be published',
      body: 'You have a listing in Draft. Review it before students can find it.',
      actionLabel: 'Review listing',
    }
  }
  return {
    title: 'Listings waiting to be published',
    body: `You have ${draftCount} listings in Draft. Open Listings to review them.`,
    actionLabel: 'Go to listings',
  }
}

export function landlordActiveListingsCardSubline(activeCount: number, draftCount: number): string {
  if (draftCount === 1) return '1 waiting to publish'
  if (draftCount > 1) return `${draftCount} waiting to publish`
  return activeCount > 0 ? 'Published as active' : 'None published yet'
}
