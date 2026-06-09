/** Strip signing embed URLs from persisted DocuSeal metadata (unwind / archive cleanup). */
export function stripDocusealEmbedSrcFromMetadata(metadata: unknown): Record<string, unknown> {
  const meta =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {}

  const resp = meta.docuseal_response
  if (resp && typeof resp === 'object' && !Array.isArray(resp)) {
    const r = { ...(resp as Record<string, unknown>) }
    if (Array.isArray(r.submitters)) {
      r.submitters = r.submitters.map((s) => {
        if (!s || typeof s !== 'object') return s
        const copy = { ...(s as Record<string, unknown>) }
        delete copy.embed_src
        return copy
      })
    }
    meta.docuseal_response = r
  }

  return meta
}
