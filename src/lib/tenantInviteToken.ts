/** SHA-256 hex digest for tenant invite token storage (matches resolve_tenant_invite RPC). */
export async function hashTenantInviteToken(rawToken: string): Promise<string> {
  const data = new TextEncoder().encode(rawToken.trim())
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 32-byte random token (64 hex chars) — shown once in the copyable invite link. */
export function generateTenantInviteRawToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function generateTenantInviteTokenPair(): Promise<{ raw: string; hash: string }> {
  const raw = generateTenantInviteRawToken()
  const hash = await hashTenantInviteToken(raw)
  return { raw, hash }
}
