import type { BookingFitRow } from '../../lib/bookingFitSummary'

function statusChip(status: BookingFitRow['status']) {
  if (status === 'match') return 'bg-emerald-100 text-emerald-900'
  if (status === 'mismatch') return 'bg-rose-100 text-rose-900'
  return 'bg-gray-100 text-gray-700'
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
    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50/90 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-3 py-2.5">Topic</th>
            <th className="px-3 py-2.5 hidden sm:table-cell">Student</th>
            <th className="px-3 py-2.5 hidden md:table-cell">Listing</th>
            <th className="px-3 py-2.5 w-24">Fit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-gray-100 align-top">
              <td className="px-3 py-2.5 font-medium text-gray-900">{row.label}</td>
              <td className="px-3 py-2.5 text-gray-700 hidden sm:table-cell">{row.studentSide}</td>
              <td className="px-3 py-2.5 text-gray-600 hidden md:table-cell">{row.propertySide}</td>
              <td className="px-3 py-2.5">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusChip(row.status)}`}>
                  {statusLabel(row.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100 sm:hidden">
        Turn your device or use a larger screen to see student vs listing columns side by side.
      </p>
    </div>
  )
}
