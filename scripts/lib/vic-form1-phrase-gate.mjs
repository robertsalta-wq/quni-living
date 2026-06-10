/**
 * Regression phrase gate for VIC CAV Form 1 (docx extract or blank PDF text).
 */

/** Stable prescribed phrases — see docs/vic/source.json textVerification. */
/** Full gate for blank PDF text extract (includes OFFICIAL footer). */
export const VIC_FORM1_REGRESSION_PHRASES = [
  'Residential Tenancies Act 1997 Section 26(1)',
  'Residential Tenancies Regulations 2021 Regulation 10(1)',
  'Part A – Basic terms',
  'residential rental provider',
  'at least 90 days written notice of a proposed rent increase',
  'Telephone interpreter service',
  'Arabic',
  'OFFICIAL',
]

/** Docx/mammoth extract gate — OFFICIAL lives in footer XML, not mammoth body. */
export const VIC_FORM1_DOCX_REGRESSION_PHRASES = VIC_FORM1_REGRESSION_PHRASES.filter(
  (p) => p !== 'OFFICIAL',
)

export function normalizeForPhraseCompare(s) {
  return s
    .toLowerCase()
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s$.,;:()/-]/g, '')
    .trim()
}

/**
 * @param {string} haystack
 * @param {readonly string[]} [phrases]
 */
export function phraseCoverage(haystack, phrases = VIC_FORM1_REGRESSION_PHRASES) {
  const norm = normalizeForPhraseCompare(haystack)
  const found = []
  const missing = []
  for (const phrase of phrases) {
    const p = normalizeForPhraseCompare(phrase)
    if (norm.includes(p)) found.push(phrase)
    else missing.push(phrase)
  }
  return {
    found,
    missing,
    coveragePct: Math.round((found.length / phrases.length) * 100),
  }
}
