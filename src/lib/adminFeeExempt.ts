import { apiUrl } from './apiUrl'

export type FeeExemptAccount = {
  id: string
  email: string
  notes: string | null
  created_at: string
  created_by: string | null
}

export async function fetchFeeExemptAccounts(authHeader: string): Promise<FeeExemptAccount[]> {
  const res = await fetch(apiUrl('/api/admin/fee-exempt'), {
    headers: { Authorization: authHeader },
  })
  const json = (await res.json()) as { accounts?: FeeExemptAccount[]; error?: string }
  if (!res.ok) {
    throw new Error(json.error || 'Could not load fee-exempt accounts')
  }
  return json.accounts ?? []
}

export async function addFeeExemptAccount(
  authHeader: string,
  email: string,
  notes?: string,
): Promise<FeeExemptAccount> {
  const res = await fetch(apiUrl('/api/admin/fee-exempt'), {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, notes: notes?.trim() || undefined }),
  })
  const json = (await res.json()) as { account?: FeeExemptAccount; error?: string }
  if (!res.ok) {
    throw new Error(json.error || 'Could not add fee-exempt account')
  }
  if (!json.account) {
    throw new Error('Invalid response from server')
  }
  return json.account
}

export async function removeFeeExemptAccount(authHeader: string, email: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/fee-exempt?email=${encodeURIComponent(email)}`), {
    method: 'DELETE',
    headers: { Authorization: authHeader },
  })
  const json = (await res.json()) as { error?: string }
  if (!res.ok) {
    throw new Error(json.error || 'Could not remove fee-exempt account')
  }
}
