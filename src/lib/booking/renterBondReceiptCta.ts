/**
 * Whether the renter dashboard should show "Download / View bond receipt".
 * Gate on a persisted bond_receipt row (or equivalent signal), not boarding property_type.
 */
export function renterBondReceiptDownloadVisible(args: {
  bookingStatus: string
  hasBondReceipt: boolean
}): boolean {
  const st = args.bookingStatus
  if (st !== 'confirmed' && st !== 'active' && st !== 'completed') return false
  return Boolean(args.hasBondReceipt)
}

/** True when a tenancy_documents embed (or flat list) includes a bond_receipt row. */
export function bookingHasBondReceiptDocument(
  docs: Array<{ document_type?: string | null } | null> | null | undefined,
): boolean {
  if (!Array.isArray(docs)) return false
  return docs.some((d) => d != null && d.document_type === 'bond_receipt')
}
