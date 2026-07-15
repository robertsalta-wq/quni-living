import type { BookingFitRow } from '../../lib/bookingFitSummary'

function statusChip(status: BookingFitRow['status']) {
  if (status === 'match') return 'bg-admin-success-bg text-admin-success-fg'
  if (status === 'mismatch') return 'bg-admin-danger-bg text-admin-danger-fg'
  return 'bg-admin-surface-3 text-admin-ink-3'
}

function statusLabel(status: BookingFitRow['status']) {
  if (status === 'match') return 'Match'
  if (status === 'mismatch') return 'Check'
  return 'Unknown'
}

type Props = {
  rows: BookingFitRow[]
}

export default function BookingFitSummaryTable({ rows }: Props) {
  return (
    <>
      <div className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <div key={row.label} className="rounded-admin-md border border-admin-line-soft bg-white p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-admin-ink">{row.label}</p>
              <span
                className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${statusChip(row.status)}`}
              >
                {statusLabel(row.status)}
              </span>
            </div>
            <dl className="mt-2.5 space-y-2 text-xs">
              <div>
                <dt className="font-semibold uppercase tracking-wide text-admin-ink-5">Student</dt>
                <dd className="mt-0.5 text-admin-ink-2 leading-snug">{row.studentSide}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-admin-ink-5">Listing</dt>
                <dd className="mt-0.5 text-admin-ink-3 leading-snug">{row.propertySide}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="hidden sm:block rounded-admin-md border border-admin-line-soft overflow-hidden bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-admin-surface-2/90 text-left text-xs font-semibold uppercase tracking-wide text-admin-ink-5">
              <th className="px-3 py-2.5">Topic</th>
              <th className="px-3 py-2.5">Student</th>
              <th className="px-3 py-2.5">Listing</th>
              <th className="px-3 py-2.5 w-24">Fit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-admin-line-soft align-top">
                <td className="px-3 py-2.5 font-medium text-admin-ink">{row.label}</td>
                <td className="px-3 py-2.5 text-admin-ink-3">{row.studentSide}</td>
                <td className="px-3 py-2.5 text-admin-ink-4">{row.propertySide}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusChip(row.status)}`}
                  >
                    {statusLabel(row.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
