/** Shared spoken-language list for renter and landlord profiles. */
export const SPOKEN_LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'bengali', label: 'Bengali' },
  { value: 'cantonese', label: 'Cantonese' },
  { value: 'dutch', label: 'Dutch' },
  { value: 'farsi', label: 'Farsi' },
  { value: 'filipino', label: 'Filipino' },
  { value: 'french', label: 'French' },
  { value: 'german', label: 'German' },
  { value: 'greek', label: 'Greek' },
  { value: 'gujarati', label: 'Gujarati' },
  { value: 'hebrew', label: 'Hebrew' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'indonesian', label: 'Indonesian' },
  { value: 'italian', label: 'Italian' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'korean', label: 'Korean' },
  { value: 'malay', label: 'Malay' },
  { value: 'mandarin', label: 'Mandarin Chinese' },
  { value: 'nepali', label: 'Nepali' },
  { value: 'polish', label: 'Polish' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'punjabi', label: 'Punjabi' },
  { value: 'russian', label: 'Russian' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'swahili', label: 'Swahili' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'thai', label: 'Thai' },
  { value: 'turkish', label: 'Turkish' },
  { value: 'urdu', label: 'Urdu' },
  { value: 'vietnamese', label: 'Vietnamese' },
] as const

export type SpokenLanguageCode = (typeof SPOKEN_LANGUAGE_OPTIONS)[number]['value']

export const SPOKEN_LANGUAGE_CODE_SET = new Set<string>(SPOKEN_LANGUAGE_OPTIONS.map((o) => o.value))

const LABEL_BY_CODE = Object.fromEntries(SPOKEN_LANGUAGE_OPTIONS.map((o) => [o.value, o.label])) as Record<
  SpokenLanguageCode,
  string
>

/** Keep only known codes, preserve first-seen order, drop duplicates. */
export function normalizeLanguagesSpoken(raw: unknown): SpokenLanguageCode[] {
  if (!Array.isArray(raw)) return []
  const out: SpokenLanguageCode[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    if (!SPOKEN_LANGUAGE_CODE_SET.has(item)) continue
    if (out.includes(item as SpokenLanguageCode)) continue
    out.push(item as SpokenLanguageCode)
  }
  return out
}

export function spokenLanguageLabel(code: string): string {
  return LABEL_BY_CODE[code as SpokenLanguageCode] ?? code
}

export function spokenLanguageLabels(codes: string[] | null | undefined): string[] {
  return normalizeLanguagesSpoken(codes).map(spokenLanguageLabel)
}

export function formatLanguagesSpoken(codes: string[] | null | undefined): string {
  return spokenLanguageLabels(codes).join(', ')
}
