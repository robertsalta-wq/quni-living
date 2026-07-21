import { useEffect, useMemo, useState } from 'react'
import {
  getSublettingResource,
  prefillSubletLetter,
  SUBLET_DISCLAIMER,
} from '../../lib/sublettingResources'

type HeadTenantSubletHelperProps = {
  stateCode: string
  listingAddress: string
  listerName: string
  /** When consent is not yet obtained, show the letter prominently (always expanded). */
  consentRequired?: boolean
}

export default function HeadTenantSubletHelper({
  stateCode,
  listingAddress,
  listerName,
  consentRequired = false,
}: HeadTenantSubletHelperProps) {
  const resource = useMemo(() => getSublettingResource(stateCode), [stateCode])
  const [expanded, setExpanded] = useState(consentRequired)
  const [letterCopied, setLetterCopied] = useState(false)

  const prefillLetter = useMemo(() => {
    if (!resource.letterTemplate.trim()) return ''
    return prefillSubletLetter(resource.letterTemplate, {
      propertyAddress: listingAddress,
      listerName,
    })
  }, [resource.letterTemplate, listingAddress, listerName])

  const [letterText, setLetterText] = useState(prefillLetter)

  useEffect(() => {
    setLetterText(prefillLetter)
  }, [prefillLetter])

  useEffect(() => {
    if (!letterCopied) return
    const timer = window.setTimeout(() => setLetterCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [letterCopied])

  const mailtoHref = useMemo(() => {
    const subject = `Request for consent to sub-let a room at ${listingAddress.trim() || '[Property Address]'}`
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(letterText)}`
  }, [listingAddress, letterText])

  const hasLetter = Boolean(resource.letterTemplate.trim())
  const showExpanded = consentRequired || expanded

  useEffect(() => {
    if (consentRequired) setExpanded(true)
  }, [consentRequired])

  return (
    <div className="mt-3 rounded-xl border border-admin-coral/30 bg-admin-coral/5 overflow-hidden">
      {consentRequired ? (
        <div className="px-4 py-3 text-sm font-medium text-[var(--quni-navy)]">
          Request your landlord&apos;s written consent
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-[var(--quni-navy)] hover:bg-admin-coral/10 transition-colors"
          aria-expanded={expanded}
        >
          <span>Need help requesting landlord consent?</span>
          <span className="text-[var(--quni-coral)] text-xs font-semibold shrink-0" aria-hidden>
            {expanded ? 'Hide' : 'Show'}
          </span>
        </button>
      )}

      {showExpanded ? (
        <div className="border-t border-admin-coral/20 px-4 py-4 space-y-3">
          <p className="text-sm text-admin-navy/90 leading-relaxed">{resource.ruleSummary}</p>

          {resource.legalRef ? (
            <p className="text-xs text-admin-navy/60">{resource.legalRef}</p>
          ) : null}

          {hasLetter ? (
            <>
              <label htmlFor="sublet-request-letter" className="block text-xs font-semibold text-[var(--quni-navy)]">
                Request letter (edit before sending)
              </label>
              <textarea
                id="sublet-request-letter"
                value={letterText}
                onChange={(e) => setLetterText(e.target.value)}
                rows={14}
                className="w-full rounded-lg border border-admin-navy/20 bg-white px-3 py-2 text-sm text-[var(--quni-navy)] font-mono leading-relaxed focus:border-[var(--quni-coral)] focus:outline-none focus:ring-2 focus:ring-admin-coral/25"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(letterText).then(() => setLetterCopied(true))
                  }}
                  className="inline-flex items-center rounded-lg bg-[var(--quni-coral)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--quni-coral-hover)] focus:outline-none focus:ring-2 focus:ring-admin-coral/40"
                >
                  {letterCopied ? 'Copied!' : 'Copy letter'}
                </button>
                <a
                  href={mailtoHref}
                  className="inline-flex items-center rounded-lg border border-admin-navy/25 bg-white px-4 py-2 text-sm font-medium text-[var(--quni-navy)] hover:border-admin-coral/50 hover:bg-admin-coral/5 focus:outline-none focus:ring-2 focus:ring-admin-coral/25"
                >
                  Open in email
                </a>
              </div>
            </>
          ) : (
            <p className="text-sm text-admin-navy/80">
              Contact {resource.authorityName} for guidance on sub-letting in your state.
            </p>
          )}

          <p className="text-xs text-admin-navy/60 leading-relaxed">{SUBLET_DISCLAIMER}</p>

          {resource.note ? (
            <p className="text-xs text-admin-navy/75 rounded-lg bg-white/80 border border-admin-navy/10 px-3 py-2">
              {resource.note}
            </p>
          ) : null}

          {resource.officialUrl ? (
            <p className="text-xs">
              <a
                href={resource.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-admin-navy/55 underline underline-offset-2 hover:text-[var(--quni-coral)]"
              >
                Official {resource.authorityName} guidance
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
