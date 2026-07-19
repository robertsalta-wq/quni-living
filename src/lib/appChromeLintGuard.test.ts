/**
 * Mirrors scripts/check-app-chrome.mjs so unit CI also fails on chrome drift.
 * See docs/app-chrome-brief.md §6.
 */
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

describe('app chrome lint guard (§6)', () => {
  it('passes on the current tree (no hand-rolled chrome outside the shells)', () => {
    const script = join(process.cwd(), 'scripts', 'check-app-chrome.mjs')
    const out = execFileSync(process.execPath, [script], {
      encoding: 'utf8',
      cwd: process.cwd(),
    })
    expect(out).toContain('ok')
  })
})
