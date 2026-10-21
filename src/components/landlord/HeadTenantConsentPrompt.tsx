type Listing = {
  id: string
  title: string | null
}

type Props = {
  listings: Listing[]
  busyId: string | null
  onConfirm: (propertyId: string) => void
}

export default function HeadTenantConsentPrompt({ listings, busyId, onConfirm }: Props) {
  if (listings.length === 0) return null

  return (
    <div
      className="mb-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
      data-testid="head-tenant-consent-prompt"
      role="region"
      aria-label="Written landlord consent"
    >
      <p className="text-sm font-medium text-gray-900">
        Confirm you have your landlord&apos;s written consent to sub-let
      </p>
      <p className="text-sm text-gray-700">
        {listings.length === 1
          ? 'This live listing is a head-tenant sub-let, and we do not have that written consent on record.'
          : 'These live listings are head-tenant sub-lets, and we do not have that written consent on record.'}{' '}
        Answering yes records the date. Keep the written consent yourself in case we ask for it.
      </p>
      <ul className="space-y-2">
        {listings.map((listing) => {
          const busy = busyId === listing.id
          return (
            <li key={listing.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-900">{listing.title?.trim() || 'Untitled listing'}</span>
              <button
                type="button"
                data-testid={`confirm-head-tenant-consent-${listing.id}`}
                disabled={busyId != null}
                onClick={() => onConfirm(listing.id)}
                className="rounded-lg bg-[var(--quni-coral)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--quni-coral-hover)] disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Yes, I have written consent'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
