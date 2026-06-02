/** Short display reference derived from booking UUID (matches emails and landlord review). */
export function bookingReferenceLabel(bookingId: string): string {
  return bookingId.replace(/-/g, '').slice(0, 8).toUpperCase()
}
