import { ANTHROPIC_SONNET_MODEL } from './anthropicModel.js'

export type AnthropicProbeResult = { ok: true } | { ok: false; status?: number; message: string }

/** Minimal Anthropic call to verify the configured model ID works (no web search). */
export async function probeAnthropicModel(apiKey: string): Promise<AnthropicProbeResult> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_SONNET_MODEL,
        max_tokens: 16,
        messages: [{ role: 'user', content: 'Health check. Reply with exactly: OK' }],
      }),
    })

    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: data.error?.message || `HTTP ${res.status}`,
      }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error' }
  }
}
