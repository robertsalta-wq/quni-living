import { formatLanguagesSpoken, normalizeLanguagesSpoken, spokenLanguageLabel } from '../../lib/languagesSpoken'

type Props = {
  languages: string[] | null | undefined
  className?: string
  /** Inline comma-separated text instead of chips. */
  inline?: boolean
  label?: string
}

export default function LanguagesSpokenDisplay({
  languages,
  className = '',
  inline = false,
  label = 'Languages',
}: Props) {
  const codes = normalizeLanguagesSpoken(languages)
  if (codes.length === 0) return null

  if (inline) {
    return (
      <p className={`text-sm text-gray-600 ${className}`.trim()}>
        <span className="text-gray-500">{label}:</span> {formatLanguagesSpoken(codes)}
      </p>
    )
  }

  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {codes.map((code) => (
          <span
            key={code}
            className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-800"
          >
            {spokenLanguageLabel(code)}
          </span>
        ))}
      </div>
    </div>
  )
}
