import { Text, View } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'

export type VicForm1ClauseStyles = {
  bodyTight: Style
  clauseSectionTitle: Style
  clauseNote: Style
  todoLine: Style
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

function isPartHeading(line: string): boolean {
  const t = line.trim()
  return /^PART [A-F]—/i.test(t) || /^Part [A-F] –/.test(t)
}

function isTodoLine(line: string): boolean {
  return line.includes('[TODO(VIC-FORM1')
}

export function VicForm1ClauseLine({ line, styles }: { line: string; styles: VicForm1ClauseStyles }) {
  const raw = line
  const t = raw.trimEnd()
  if (!t.trim()) return <View style={{ height: 3 }} />

  if (isTodoLine(t)) {
    return <Text style={styles.todoLine}>{t}</Text>
  }

  if (isPartHeading(t)) {
    return <Text style={styles.clauseSectionTitle}>{t}</Text>
  }

  if (/^note\s:/i.test(t.trim())) {
    return <Text style={styles.clauseNote}>{t}</Text>
  }

  const numbered = /^(\d+(?:\.\d+)*[A-Z]?\.?)\s+(.+)$/.exec(t.trim())
  if (numbered && /^\d/.test(numbered[1])) {
    return (
      <Text style={styles.bodyTight}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{numbered[1]} </Text>
        {numbered[2]}
      </Text>
    )
  }

  const subLetter = /^\(([a-z])\)\s+(.+)$/.exec(t.trim())
  if (subLetter) {
    return (
      <Text style={styles.bodyTight}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>({subLetter[1]}) </Text>
        {subLetter[2]}
      </Text>
    )
  }

  const subRoman = /^\(([ivx]+)\)\s+(.+)$/i.exec(t.trim())
  if (subRoman) {
    return (
      <Text style={styles.bodyTight}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>({subRoman[1]}) </Text>
        {subRoman[2]}
      </Text>
    )
  }

  if (t.startsWith('•')) {
    return <Text style={[styles.bodyTight, { paddingLeft: 8 }]}>{t}</Text>
  }

  return <Text style={styles.bodyTight}>{raw}</Text>
}

export function VicForm1ClauseChunkBody({ text, styles }: { text: string; styles: VicForm1ClauseStyles }) {
  const lines = text.split('\n')
  return (
    <View>
      {lines.map((line, i) => (
        <VicForm1ClauseLine key={i} line={line} styles={styles} />
      ))}
    </View>
  )
}
