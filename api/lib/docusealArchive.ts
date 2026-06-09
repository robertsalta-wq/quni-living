/**
 * DocuSeal submission archive (DELETE /api/submissions/{id}).
 * submission ids are stored as String(submission.id) from the create response (numeric).
 */

export type ArchiveDocusealSubmissionResult =
  | { ok: true; outcome: 'archived' | 'already_gone' | 'skipped_not_configured' | 'skipped_no_id' | 'skipped_invalid_id' }
  | { ok: false; outcome: 'failed'; status: number; message: string }

function getDocusealApiBase(): string | null {
  const rawBase = (process.env.DOCUSEAL_API_URL || '').trim().replace(/\/$/, '')
  if (!rawBase) return null
  return rawBase.replace(/\/api$/i, '')
}

function docusealAuthHeaders(): Record<string, string> {
  const token = (process.env.DOCUSEAL_API_TOKEN || '').trim()
  return {
    'Content-Type': 'application/json',
    'X-Auth-Token': token,
  }
}

/** Normalize stored submission id to the numeric DocuSeal archive path segment. */
export function normalizeDocusealSubmissionId(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim()
  if (!s) return null
  if (!/^\d+$/.test(s)) {
    console.warn('[docuseal-archive] submission id is not numeric', { raw: s })
    return null
  }
  return s
}

function archiveToleratedStatus(status: number): boolean {
  return status === 404 || status === 410
}

function archiveToleratedMessage(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('not found') ||
    m.includes('already archived') ||
    m.includes('already been archived') ||
    m.includes('has been archived')
  )
}

/**
 * Archive a DocuSeal submission (best-effort, idempotent).
 * Never throws — callers treat booking transition as authoritative.
 */
export async function archiveDocusealSubmission(
  submissionIdRaw: string | null | undefined,
): Promise<ArchiveDocusealSubmissionResult> {
  const base = getDocusealApiBase()
  const token = (process.env.DOCUSEAL_API_TOKEN || '').trim()
  if (!base || !token) {
    return { ok: true, outcome: 'skipped_not_configured' }
  }

  const submissionId = normalizeDocusealSubmissionId(submissionIdRaw)
  if (!submissionIdRaw?.trim()) {
    return { ok: true, outcome: 'skipped_no_id' }
  }
  if (!submissionId) {
    return { ok: true, outcome: 'skipped_invalid_id' }
  }

  const url = `${base}/api/submissions/${submissionId}`

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: docusealAuthHeaders(),
    })

    if (res.ok || res.status === 204) {
      return { ok: true, outcome: 'archived' }
    }

    const text = await res.text()
    if (archiveToleratedStatus(res.status) || archiveToleratedMessage(text)) {
      return { ok: true, outcome: 'already_gone' }
    }

    return {
      ok: false,
      outcome: 'failed',
      status: res.status,
      message: text.slice(0, 500) || `DocuSeal DELETE ${res.status}`,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, outcome: 'failed', status: 0, message }
  }
}
