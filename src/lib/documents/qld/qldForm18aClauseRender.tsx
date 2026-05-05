import { Text, View } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'

/** Styles passed from parent StyleSheet.create(...) */
export type Form18aClauseStyles = {
  bodyTight: Style
  clauseSectionTitle: Style
  clauseNote: Style
  divisionTitle: Style
}

export function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length)
    if (end < text.length) {
      const cut = text.lastIndexOf('\n\n', end)
      if (cut > start) end = cut
      else {
        const cut2 = text.lastIndexOf('\n', end)
        if (cut2 > start) end = cut2
      }
    }
    chunks.push(text.slice(start, end))
    start = end
  }
  return chunks
}

function normalizeLineForMatching(line: string): string {
  return line.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim()
}

export function Form18aClauseLine({
  line,
  styles,
}: {
  line: string
  styles: Form18aClauseStyles
}) {
  const raw = line
  const t = raw.trimEnd()
  if (!t.trim()) return <View style={{ height: 3 }} />

  const n = normalizeLineForMatching(t)
  if (/^division \d+/i.test(n)) {
    return <Text style={styles.divisionTitle}>{t.trim()}</Text>
  }
  if (/^note[ –-]/i.test(t.trim())) {
    return <Text style={styles.clauseNote}>{t}</Text>
  }
  if (/^examples? for/i.test(t.trim())) {
    return <Text style={styles.clauseNote}>{t}</Text>
  }

  const upperBlock =
    t.length >= 4 &&
    t.length <= 88 &&
    t === t.toUpperCase() &&
    /^[A-Z0-9][A-Z0-9 '\-#&,]+$/.test(t)
  if (upperBlock && !/^\d/.test(t)) {
    return <Text style={styles.clauseSectionTitle}>{t}</Text>
  }

  const tabbed = /^(\d+(?:\.\d+)*)\s+(.+)$/.exec(t.replace(/\t/g, '    '))
  if (tabbed && /^\d/.test(tabbed[1])) {
    const rest = tabbed[2] ?? ''
    return (
      <Text style={styles.bodyTight}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{tabbed[1]} </Text>
        {rest}
      </Text>
    )
  }

  const numbered = /^(\d+(?:\.\d+)*\.?)\s+(.+)$/.exec(n)
  if (numbered && /^\d/.test(numbered[1])) {
    return (
      <Text style={styles.bodyTight}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{numbered[1]} </Text>
        {raw.replace(/^\s*\d+(?:\.\d+)*\.?\s+/, '').trimStart()}
      </Text>
    )
  }

  const subNum = /^(\(\d+\))\s*(.*)$/.exec(t.trim())
  if (subNum) {
    return (
      <Text style={styles.bodyTight}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{subNum[1]} </Text>
        {subNum[2]}
      </Text>
    )
  }

  const letterItem = /^(\([a-z]\))\s*(.*)$/i.exec(t.trim())
  if (letterItem) {
    return (
      <Text style={styles.bodyTight}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{letterItem[1]} </Text>
        {letterItem[2]}
      </Text>
    )
  }

  return <Text style={styles.bodyTight}>{raw}</Text>
}

export function Form18aClauseChunkBody({
  text,
  styles,
}: {
  text: string
  styles: Form18aClauseStyles
}) {
  const lines = text.split(/\n/)
  return (
    <View>
      {lines.map((line, i) => (
        <Form18aClauseLine key={i} line={line} styles={styles} />
      ))}
    </View>
  )
}
