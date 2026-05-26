import type { MaskType } from './conversationTypes.js'

export const MASK_REPLACEMENT = '[contact hidden]'

export type ContactMaskMatch = {
  maskType: MaskType
  match: string
  start: number
  end: number
}

export type MaskContactInfoResult = {
  maskedBody: string
  matches: ContactMaskMatch[]
}

type PatternDef = {
  maskType: MaskType
  regex: RegExp
}

const PATTERNS: PatternDef[] = [
  {
    maskType: 'email',
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    maskType: 'url',
    regex: /\bhttps?:\/\/[^\s<>"']+/gi,
  },
  {
    maskType: 'url',
    regex: /\bwww\.[a-z0-9][-a-z0-9.]+\.[a-z]{2,}(?:\/[^\s<>"']*)?/gi,
  },
  {
    maskType: 'phone',
    regex: /\+61[\s.-]*(?:\(?0?\)?[\s.-]*)?[2-478](?:[\s.-]*\d){8}\b/g,
  },
  {
    maskType: 'phone',
    regex: /\(?(?:\+?61[\s.-]*)?0[2-478]\)?[\s.-]*(?:\d[\s.-]?){8}\b/g,
  },
  {
    maskType: 'phone',
    regex: /\b0[2-478]\d{8}\b/g,
  },
  {
    maskType: 'social',
    regex: /\bwa\.me\/\+?\d[\d\s-]{6,}\b/gi,
  },
  {
    maskType: 'social',
    regex: /\bt\.me\/[a-z0-9_]{3,32}\b/gi,
  },
  {
    maskType: 'social',
    regex: /\b(?:instagram|instagr\.am|facebook|fb|telegram|signal|whatsapp|snapchat)\.com\/[^\s<>"']+/gi,
  },
  {
    maskType: 'social',
    regex: /@[a-z0-9._]{2,32}\b/gi,
  },
  {
    maskType: 'social',
    regex:
      /\b(?:find|msg|message|text|dm|contact)\s+me\s+on\s+(?:signal|telegram|whatsapp|insta(?:gram)?|snap(?:chat)?|fb|facebook)\b/gi,
  },
  {
    maskType: 'social',
    regex: /\b(?:signal|telegram|whatsapp|insta(?:gram)?)\s*[:@-]?\s*@?[a-z0-9._]{2,32}\b/gi,
  },
]

const SPELLED_DIGIT_ALT =
  'zero|oh|o|one|won|two|to|too|three|four|for|five|six|seven|eight|ate|nine'

const SPELLED_DIGIT_WORD_START = new RegExp(`^(?:${SPELLED_DIGIT_ALT})\\b`, 'i')

const MIN_SPELLED_DIGITS = 8

function spelledDigitSeparatorLength(tail: string): number {
  const m = /^(?:\s+and\s+|\s+|\s*,\s*|\s*-\s+)/i.exec(tail)
  return m?.[0].length ?? 0
}

function collectSpelledPhoneMatches(text: string): ContactMaskMatch[] {
  const out: ContactMaskMatch[] = []
  const re = new RegExp(`\\b(?:${SPELLED_DIGIT_ALT})\\b`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    let count = 1
    let end = m.index + m[0].length
    let cursor = end
    while (count < 20) {
      const tail = text.slice(cursor)
      const sep = spelledDigitSeparatorLength(tail)
      if (!sep) break
      cursor += sep
      const next = SPELLED_DIGIT_WORD_START.exec(text.slice(cursor))
      if (!next) break
      count += 1
      cursor += next[0].length
      end = cursor
    }
    if (count >= MIN_SPELLED_DIGITS) {
      out.push({
        maskType: 'phone',
        match: text.slice(m.index, end),
        start: m.index,
        end,
      })
      re.lastIndex = end
    }
  }
  return out
}

function overlaps(a: ContactMaskMatch, b: ContactMaskMatch): boolean {
  return a.start < b.end && b.start < a.end
}

function mergeMatches(all: ContactMaskMatch[]): ContactMaskMatch[] {
  const sorted = [...all].sort((a, b) => a.start - b.start || b.end - a.end)
  const merged: ContactMaskMatch[] = []
  for (const m of sorted) {
    const last = merged[merged.length - 1]
    if (last && overlaps(last, m)) {
      if (m.end > last.end) {
        last.end = m.end
        last.match = last.match.length >= m.match.length ? last.match : m.match
      }
      continue
    }
    merged.push({ ...m })
  }
  return merged
}

function collectRegexMatches(text: string, { maskType, regex }: PatternDef): ContactMaskMatch[] {
  const out: ContactMaskMatch[] = []
  const re = new RegExp(regex.source, regex.flags)
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    out.push({
      maskType,
      match: m[0],
      start: m.index,
      end: m.index + m[0].length,
    })
  }
  return out
}

/** Detect AU contact info and return masked copy plus match metadata. */
export function maskContactInfo(body: string): MaskContactInfoResult {
  if (!body) {
    return { maskedBody: body, matches: [] }
  }

  const rawMatches: ContactMaskMatch[] = [
    ...collectSpelledPhoneMatches(body),
    ...PATTERNS.flatMap((p) => collectRegexMatches(body, p)),
  ]

  const matches = mergeMatches(rawMatches)
  if (matches.length === 0) {
    return { maskedBody: body, matches: [] }
  }

  let maskedBody = ''
  let cursor = 0
  for (const m of matches) {
    maskedBody += body.slice(cursor, m.start) + MASK_REPLACEMENT
    cursor = m.end
  }
  maskedBody += body.slice(cursor)

  return { maskedBody, matches }
}
