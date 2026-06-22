/** Shared failure branch for listing tenancy context loaders (Vercel TS 5.9 narrows on === false). */
export type ListingContextLoadFail = {
  ok: false
  status: number
  error: string
  detail?: string
}

export function isListingContextLoadFail<T>(
  loaded: { ok: true; ctx: T } | ListingContextLoadFail,
): loaded is ListingContextLoadFail {
  return loaded.ok === false
}

export function listingContextLoadFailure(loaded: ListingContextLoadFail): ListingContextLoadFail {
  return { ok: false, status: loaded.status, error: loaded.error, detail: loaded.detail }
}
