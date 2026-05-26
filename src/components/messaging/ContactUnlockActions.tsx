type ContactDetails = {
  fullName: string | null
  email: string | null
  phone: string | null
}

type Props = {
  landlord: ContactDetails | null
  tenant: ContactDetails | null
  viewerRole: 'tenant' | 'landlord'
}

function ContactCard({ label, details }: { label: string; details: ContactDetails }) {
  const name = details.fullName?.trim() || label
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
      <p className="font-medium text-emerald-950">{name}</p>
      {details.email?.trim() && (
        <p className="mt-1">
          <a href={`mailto:${details.email}`} className="text-emerald-800 underline underline-offset-2">
            {details.email}
          </a>
        </p>
      )}
      {details.phone?.trim() && (
        <p className="mt-0.5">
          <a href={`tel:${details.phone.replace(/\s/g, '')}`} className="text-emerald-800 underline underline-offset-2">
            {details.phone}
          </a>
        </p>
      )}
    </div>
  )
}

export default function ContactUnlockActions({ landlord, tenant, viewerRole }: Props) {
  const other = viewerRole === 'tenant' ? landlord : tenant
  if (!other) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Contact unlocked</p>
      <ContactCard label={viewerRole === 'tenant' ? 'Landlord' : 'Tenant'} details={other} />
    </div>
  )
}
