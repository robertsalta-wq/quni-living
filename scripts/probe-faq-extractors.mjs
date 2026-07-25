/**
 * Probe: can common extractors see FAQ answers on live /faq?
 * Scores against (A) body text inside <details>, (B) FAQPage JSON-LD answers.
 * Usage: node scripts/probe-faq-extractors.mjs [url]
 */
import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'
import { convert } from 'html-to-text'
import TurndownService from 'turndown'

const url = process.argv[2] || 'https://quni.com.au/faq'

const res = await fetch(url, {
  headers: { 'User-Agent': 'quni-faq-extractor-probe/1.0', 'Cache-Control': 'no-cache' },
})
const html = await res.text()

function extractLdAnswers(docHtml) {
  const out = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(docHtml))) {
    try {
      const j = JSON.parse(m[1])
      for (const obj of Array.isArray(j) ? j : [j]) {
        if (obj?.['@type'] !== 'FAQPage') continue
        for (const e of obj.mainEntity || []) {
          const t = e?.acceptedAnswer?.text?.trim()
          if (t) out.push(t)
        }
      }
    } catch {
      /* ignore */
    }
  }
  return out
}

/** Body answers: <details> (legacy) or CSS-collapse regions (role=region + aria-labelledby). */
function extractBodyAnswers(docHtml) {
  const { document } = parseHTML(docHtml)
  const fromDetails = [...document.querySelectorAll('details')].map((d) => {
    const summary = d.querySelector('summary')
    const clone = d.cloneNode(true)
    clone.querySelector('summary')?.remove()
    return {
      question: (summary?.textContent || '').replace(/\s+/g, ' ').trim(),
      answer: (clone.textContent || '').replace(/\s+/g, ' ').trim(),
    }
  })
  const fromRegions = [...document.querySelectorAll('[role="region"][aria-labelledby]')].map((region) => {
    const btn = document.getElementById(region.getAttribute('aria-labelledby') || '')
    return {
      question: (btn?.textContent || '').replace(/\s+/g, ' ').trim(),
      answer: (region.textContent || '').replace(/\s+/g, ' ').trim(),
    }
  })
  const pairs = (fromDetails.length ? fromDetails : fromRegions).filter((x) => x.answer.length > 0)
  return { pairs, mode: fromDetails.length ? 'details' : 'css-collapse-region' }
}

function needle(s, n = 72) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, n)
}

function score(label, text, answers, { note } = {}) {
  const norm = text.replace(/\s+/g, ' ').toLowerCase()
  let hit = 0
  const missing = []
  for (const a of answers) {
    const n = needle(a)
    if (n.length >= 24 && norm.includes(n)) hit += 1
    else missing.push(a.slice(0, 70))
  }
  console.log(`\n=== ${label} ===`)
  if (note) console.log(note)
  console.log(`chars=${text.length} answers_found=${hit}/${answers.length}`)
  if (missing.length) {
    console.log(`missing ${missing.length} (first 3):`, missing.slice(0, 3))
  }
  return { label, hit, expected: answers.length, chars: text.length, missing: missing.length }
}

const ldAnswers = extractLdAnswers(html)
const { pairs: bodyPairs, mode: bodyMode } = extractBodyAnswers(html)
const bodyAnswers = bodyPairs.map((p) => p.answer)

console.log(`Fetched ${url} (${html.length} bytes)`)
console.log(`JSON-LD FAQ answers: ${ldAnswers.length}`)
console.log(`Body answers (${bodyMode}): ${bodyAnswers.length}`)
console.log(`open details in source: ${(html.match(/<details[^>]*\sopen[\s>]/gi) || []).length}`)
console.log(`details count: ${(html.match(/<details/gi) || []).length}`)

const plain = html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const htmlToTextOut = convert(html, {
  wordwrap: false,
  selectors: [
    { selector: 'script', format: 'skip' },
    { selector: 'style', format: 'skip' },
  ],
})

/** Simulate pipelines that drop closed <details> content. */
const htmlWithoutClosedDetails = html.replace(
  /<details(?![^>]*\sopen[\s>])[^>]*>[\s\S]*?<\/details>/gi,
  (block) => {
    // keep summary question only
    const sm = block.match(/<summary[\s\S]*?<\/summary>/i)
    return sm ? sm[0] : ''
  },
)
const htmlToTextClosedDropped = convert(htmlWithoutClosedDetails, {
  wordwrap: false,
  selectors: [
    { selector: 'script', format: 'skip' },
    { selector: 'style', format: 'skip' },
  ],
})

const td = new TurndownService({ headingStyle: 'atx' })
const md = td.turndown(html)

const { document } = parseHTML(html)
const article = new Readability(document).parse()
const readable = article?.textContent || ''

console.log('\n--- Score vs BODY answers (inside <details>) ---')
const bodyScores = [
  score('plain-text strip', plain, bodyAnswers),
  score('html-to-text', htmlToTextOut, bodyAnswers),
  score('html-to-text after dropping closed <details>', htmlToTextClosedDropped, bodyAnswers, {
    note: 'Simulates extractors that skip collapsed details regions',
  }),
  score('turndown markdown', md, bodyAnswers),
  score('mozilla/readability', readable, bodyAnswers),
]

console.log('\n--- Score vs JSON-LD answers (wording may differ from body links) ---')
score('plain-text strip vs JSON-LD', plain, ldAnswers)
score('html-to-text vs JSON-LD', htmlToTextOut, ldAnswers)

console.log('\n--- Summary ---')
for (const s of bodyScores) {
  console.log(`${s.label}: ${s.hit}/${s.expected}`)
}
