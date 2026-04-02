/**
 * `functions.invoke` often sets `error.message` to a generic string; the real
 * message is usually JSON `{ error: "..." }` on `error.context` (Response).
 */
export async function readSupabaseFunctionInvokeError(data: unknown, error: unknown): Promise<string> {
  if (data && typeof data === 'object' && data !== null && 'error' in data) {
    const e = (data as { error?: unknown }).error
    if (typeof e === 'string' && e.trim()) return e
  }
  if (!error || typeof error !== 'object') return 'Something went wrong.'
  const err = error as { message?: string; context?: unknown }
  const ctx = err.context
  if (ctx instanceof Response) {
    try {
      const text = await ctx.clone().text()
      if (text) {
        try {
          const j = JSON.parse(text) as { error?: string; message?: string }
          if (typeof j.error === 'string' && j.error.trim()) return j.error
          if (typeof j.message === 'string' && j.message.trim()) return j.message
        } catch {
          return text.trim().slice(0, 300) || err.message || 'Request failed.'
        }
      }
    } catch {
      /* ignore */
    }
  }
  const genericMsg = 'Edge Function returned a non-2xx status code'
  if (typeof err.message === 'string' && err.message.trim() && err.message !== genericMsg) {
    return err.message
  }
  return 'Something went wrong. Check you are signed in and try again.'
}
