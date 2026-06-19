export type ProofreadSuggestion = {
  id: string
  original: string
  suggested: string
  reason: string
  /** Which occurrence of \`original\` in the source text this suggestion targets. */
  occurrenceIndex: number
}

export function assignSuggestionOccurrences(
  suggestions: Array<{ original: string; suggested: string; reason: string }>,
  sourceText: string,
): ProofreadSuggestion[] {
  const usedOccurrences = new Map<string, Set<number>>()

  return suggestions.map((suggestion, index) => {
    const used = usedOccurrences.get(suggestion.original) ?? new Set<number>()
    let occurrenceIndex = 0
    let searchFrom = 0

    while (true) {
      const idx = sourceText.indexOf(suggestion.original, searchFrom)
      if (idx === -1) break
      if (!used.has(occurrenceIndex)) {
        used.add(occurrenceIndex)
        usedOccurrences.set(suggestion.original, used)
        return {
          id: `proofread-${index}-${occurrenceIndex}`,
          original: suggestion.original,
          suggested: suggestion.suggested,
          reason: suggestion.reason,
          occurrenceIndex,
        }
      }
      occurrenceIndex += 1
      searchFrom = idx + 1
    }

    return {
      id: `proofread-${index}-0`,
      original: suggestion.original,
      suggested: suggestion.suggested,
      reason: suggestion.reason,
      occurrenceIndex: 0,
    }
  })
}

export function applyProofreadSuggestion(
  sourceText: string,
  suggestion: Pick<ProofreadSuggestion, 'original' | 'suggested' | 'occurrenceIndex'>,
): string {
  let occurrence = 0
  let searchFrom = 0

  while (true) {
    const idx = sourceText.indexOf(suggestion.original, searchFrom)
    if (idx === -1) return sourceText
    if (occurrence === suggestion.occurrenceIndex) {
      return (
        sourceText.slice(0, idx) + suggestion.suggested + sourceText.slice(idx + suggestion.original.length)
      )
    }
    occurrence += 1
    searchFrom = idx + 1
  }
}
