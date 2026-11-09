import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { RENT_BOND_LONG, RENT_BOND_SHORT } from './bondPublicCopy'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/** The blanket sentence, and the same claim with the words swapped or aimed at "you". */
const FORBIDDEN = [
  'rent and bond are paid to the landlord',
  'bond and rent are paid to the landlord',
  'rent and bond are paid to you',
  'bond and rent are paid to you',
  'rent and bond paid to the landlord',
  'pay bond and rent to the landlord',
]

const SCAN_ROOTS = ['src', 'api', 'docs']

function walk(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) {
      walk(full, out)
      continue
    }
    if (!/\.(tsx?|jsx?|md|mdx)$/.test(name)) continue
    if (/\.test\.(tsx?|jsx?)$/.test(name)) continue
    out.push(full)
  }
}

describe('rent and bond are paid to the landlord', () => {
  it('keeps the short and long public sentences', () => {
    expect(RENT_BOND_SHORT).toBe(
      "Rent goes to the landlord. Bond is lodged with your state's bond authority.",
    )
    expect(RENT_BOND_LONG).toBe(
      'Rent is paid directly to the landlord. For standard tenancies, bond is lodged with the state bond authority (NSW Fair Trading, the RTA in Queensland, or the RTBA in Victoria), paid either directly or through the landlord, who must lodge it. Under some occupancy or boarder arrangements, the landlord holds the deposit. Quni never holds, transfers or refunds bond.',
    )
  })

  it('does not come back in product copy, emails, or docs', () => {
    const files: string[] = []
    for (const rel of SCAN_ROOTS) walk(path.join(ROOT, rel), files)
    const hits: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8').toLowerCase()
      for (const phrase of FORBIDDEN) {
        if (text.includes(phrase)) hits.push(`${path.relative(ROOT, file)}: ${phrase}`)
      }
    }
    expect(hits).toEqual([])
  })
})
