/**
 * Paste-your-listing entry on /landlord/property/new.
 * Calls extract-listing, applies to localStorage draft only (no DB writes).
 */
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  applyAndPersistExtractedListing,
  type ApplyExtractedListingResult,
} from '../../lib/listingExtractor/applyExtractedDraft'
import type { ExtractedListing } from '../../lib/listingExtractor/types'
import type { FeatureRowPick } from '../../lib/listingExtractor/featureNameResolve'

type Props = {
  features: FeatureRowPick[]
  onApplied: (result: ApplyExtractedListingResult) => void
}

export default function ListingPasteExtractor({ features, onApplied }: Props) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExtract() {
    setError(null)
    const paste = text.trim()
    if (paste.length < 20) {
      setError('Paste at least a short listing (20+ characters).')
      return
    }
    setBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setError('Sign in as a landlord to extract a listing.')
        return
      }
      const res = await fetch('/api/ai/extract-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: paste }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        extracted?: ExtractedListing
        unmatchedFeatureNames?: string[]
      }
      if (!res.ok) {
        setError(data.error || 'Could not extract listing.')
        return
      }
      if (!data.extracted) {
        setError('No fields could be extracted — try a fuller paste.')
        return
      }
      const result = applyAndPersistExtractedListing(
        data.extracted,
        features,
        data.unmatchedFeatureNames ?? [],
      )
      onApplied(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Extraction failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="listing-paste-extractor"
      data-testid="listing-paste-extractor"
      className="mb-8 rounded-2xl border border-[var(--quni-line)] bg-[var(--quni-surface-2)] p-5"
    >
      <h2 className="text-lg font-semibold text-[var(--quni-ink)]">Paste your existing listing</h2>
      <p className="mt-1 text-sm text-[var(--quni-ink-5)]">
        Paste the text from Facebook, Flatmates, or Gumtree. We&apos;ll pre-fill the form for you to
        review — we never fetch listing URLs, and you still choose how this is let before publishing.
      </p>
      <textarea
        data-testid="listing-paste-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Paste your listing text here…"
        className="mt-3 w-full rounded-[10px] border border-[var(--quni-input-border)] bg-white px-3.5 py-3 text-[15px] text-[var(--quni-ink)] outline-none focus:border-[var(--quni-coral)] focus:shadow-[0_0_0_3px_rgba(255,111,97,0.18)]"
      />
      {error ? (
        <p className="mt-2 text-sm text-[var(--quni-danger-fg)]" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="listing-paste-submit"
        disabled={busy}
        onClick={() => void handleExtract()}
        className="mt-3 rounded-[10px] bg-[var(--quni-coral)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--quni-coral-hover)] disabled:opacity-50"
      >
        {busy ? 'Reading your listing…' : 'Pre-fill from paste'}
      </button>
    </section>
  )
}
