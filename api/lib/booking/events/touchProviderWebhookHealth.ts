import type { SupabaseClient } from '@supabase/supabase-js'

export type ProviderWebhookName = 'resend' | 'docuseal' | 'stripe'

/**
 * Update provider_webhook_health via SECURITY DEFINER RPC.
 * Best-effort — never throws to callers.
 */
export async function touchProviderWebhookHealth(
  admin: SupabaseClient,
  provider: ProviderWebhookName,
  eventType?: string | null,
  errorMessage?: string | null,
): Promise<void> {
  try {
    const { error } = await admin.rpc('touch_provider_webhook_health', {
      p_provider: provider,
      p_event_type: eventType ?? null,
      p_error: errorMessage ?? null,
    })
    if (error) {
      console.error('[provider-webhook-health] touch failed', provider, error)
    }
  } catch (e) {
    console.error('[provider-webhook-health] touch threw', provider, e)
  }
}
