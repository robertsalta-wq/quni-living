import { SPOKEN_LANGUAGE_OPTIONS, normalizeLanguagesSpoken, type SpokenLanguageCode } from '../../lib/languagesSpoken'

type Props = {
  value: string[] | null | undefined
  onChange: (codes: SpokenLanguageCode[]) => void
  disabled?: boolean
  id?: string
}

export default function LanguagesSpokenSelector({ value, onChange, disabled, id }: Props) {
  const selected = new Set(normalizeLanguagesSpoken(value))

  function toggle(code: SpokenLanguageCode) {
    if (disabled) return
    const next = new Set(selected)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    onChange([...next])
  }

  return (
    <div id={id} className="flex flex-wrap gap-2" role="group" aria-label="Languages spoken">
      {SPOKEN_LANGUAGE_OPTIONS.map((opt) => {
        const active = selected.has(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => toggle(opt.value)}
            className={[
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              active
                ? 'border-indigo-400 bg-indigo-50 text-indigo-900'
                : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
