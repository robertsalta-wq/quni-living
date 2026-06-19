import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { absoluteUrl } from '../../lib/site'
import { generateTenantInviteTokenPair } from '../../lib/tenantInviteToken'
import { messageFromSupabaseError } from '../../lib/supabaseErrorMessage'
import type { Database } from '../../lib/database.types'

type TenantInviteRow = Database['public']['Tables']['tenant_invites']['Row']

type PropertyForInvite = {
  id: string
  title: string
  slug: string
  open_to_non_students: boolean
}

type Props = {
  open: boolean
  property: PropertyForInvite | null
  landlordProfileId: string | null
  onClose: () => void
}

type CreatedInvite = {
  rawToken: string
  url: string
}

function formatInviteExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso.slice(0, 10)
  }
}

export default function LandlordTenantInviteModal({ open, property, landlordProfileId, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdInvite, setCreatedInvite] = useState<CreatedInvite | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [pendingInvites, setPendingInvites] = useState<TenantInviteRow[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [rotatingId, setRotatingId] = useState<string | null>(null)
  const [rotatedUrl, setRotatedUrl] = useState<{ inviteId: string; url: string } | null>(null)

  const studentOnly = property ? !property.open_to_non_students : false

  const loadPendingInvites = useCallback(async () => {
    if (!property?.id) return
    setLoadingInvites(true)
    try {
      const { data, error } = await supabase
        .from('tenant_invites')
        .select('id, invited_email, invited_name, status, expires_at, created_at')
        .eq('property_id', property.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      setPendingInvites((data ?? []) as TenantInviteRow[])
    } catch {
      setPendingInvites([])
    } finally {
      setLoadingInvites(false)
    }
  }, [property?.id])

  useEffect(() => {
    if (!open || !property) return
    setEmail('')
    setName('')
    setNote('')
    setCreateError(null)
    setCreatedInvite(null)
    setCopySuccess(false)
    void loadPendingInvites()
  }, [open, property, loadPendingInvites])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!property || !landlordProfileId) return
    setCreating(true)
    setCreateError(null)
    setCreatedInvite(null)
    try {
      const { raw, hash } = await generateTenantInviteTokenPair()
      const { error } = await supabase.from('tenant_invites').insert({
        property_id: property.id,
        landlord_id: landlordProfileId,
        invited_email: email.trim() || null,
        invited_name: name.trim() || null,
        landlord_note: note.trim() || null,
        token_hash: hash,
        status: 'pending',
      })
      if (error) throw error
      const url = absoluteUrl(`/invite/${raw}`)
      setCreatedInvite({ rawToken: raw, url })
      await loadPendingInvites()
    } catch (err) {
      setCreateError(messageFromSupabaseError(err))
    } finally {
      setCreating(false)
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      window.setTimeout(() => setCopySuccess(false), 2000)
    } catch {
      setCreateError('Could not copy to clipboard. Select the link and copy manually.')
    }
  }

  async function copyAgain(inviteId: string) {
    setRotatingId(inviteId)
    setCreateError(null)
    try {
      const { raw, hash } = await generateTenantInviteTokenPair()
      const { error } = await supabase.from('tenant_invites').update({ token_hash: hash }).eq('id', inviteId)
      if (error) throw error
      const url = absoluteUrl(`/invite/${raw}`)
      setRotatedUrl({ inviteId, url })
      await copyText(url)
    } catch (err) {
      setCreateError(messageFromSupabaseError(err))
    } finally {
      setRotatingId(null)
    }
  }

  async function revokeInvite(inviteId: string) {
    setRevokingId(inviteId)
    try {
      const { error } = await supabase.from('tenant_invites').update({ status: 'revoked' }).eq('id', inviteId)
      if (error) throw error
      await loadPendingInvites()
    } catch (err) {
      setCreateError(messageFromSupabaseError(err))
    } finally {
      setRevokingId(null)
    }
  }

  if (!open || !property) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!creating && !revokingId) onClose()
        }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900">Invite a tenant</h3>
        <p className="mt-1 text-sm text-gray-600">
          Generate a link for <span className="font-medium text-gray-900">{property.title}</span>. Your tenant
          completes the same verification and booking steps as any other renter on Quni.
        </p>

        {studentOnly && (
          <p className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-gray-700">
            This room is for students only, so anyone you invite will need to verify as a student.
          </p>
        )}

        <form onSubmit={(e) => void handleCreate(e)} className="mt-4 space-y-3">
          <div>
            <label htmlFor="invite-email" className="block text-xs font-medium text-gray-700 mb-1">
              Tenant email <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Prefills signup — not enforced"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="invite-name" className="block text-xs font-medium text-gray-700 mb-1">
              Tenant name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="invite-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="invite-note" className="block text-xs font-medium text-gray-700 mb-1">
              Note <span className="text-gray-400 font-normal">(optional, for your records)</span>
            </label>
            <textarea
              id="invite-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none"
            />
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <button
            type="submit"
            disabled={creating || !landlordProfileId}
            className="w-full rounded-xl bg-[#FF6F61] text-white py-2.5 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-60"
          >
            {creating ? 'Generating link…' : 'Generate invite link'}
          </button>
        </form>

        {createdInvite && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
            <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">Copy this link now</p>
            <p className="text-xs text-emerald-800">
              For security we only store a hash of the token. This is the only time the full link is shown.
            </p>
            <p className="text-xs text-gray-800 break-all font-mono bg-white/80 rounded-lg px-2 py-1.5 border border-emerald-100">
              {createdInvite.url}
            </p>
            <button
              type="button"
              onClick={() => void copyText(createdInvite.url)}
              className="rounded-lg border border-emerald-300 bg-white text-emerald-800 px-3 py-1.5 text-sm font-medium hover:bg-emerald-50"
            >
              {copySuccess ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        )}

        <div className="mt-6 border-t border-gray-100 pt-4">
          <h4 className="text-sm font-semibold text-gray-900">Pending invites</h4>
          {loadingInvites ? (
            <p className="mt-2 text-xs text-gray-500">Loading…</p>
          ) : pendingInvites.length === 0 ? (
            <p className="mt-2 text-xs text-gray-500">No pending invites for this listing.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {pendingInvites.map((inv) => {
                const label =
                  inv.invited_name?.trim() ||
                  inv.invited_email?.trim() ||
                  `Invite · ${formatInviteExpiry(inv.expires_at)}`
                return (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">{label}</p>
                      <p className="text-xs text-gray-500">Expires {formatInviteExpiry(inv.expires_at)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void copyAgain(inv.id)}
                        disabled={rotatingId === inv.id}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        {rotatingId === inv.id
                          ? 'Copying…'
                          : rotatedUrl?.inviteId === inv.id
                            ? 'Copied!'
                            : 'Copy again'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void revokeInvite(inv.id)}
                        disabled={revokingId === inv.id}
                        className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {revokingId === inv.id ? 'Revoking…' : 'Revoke'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-gray-500">
            Copy again issues a fresh link and invalidates the previous one. Platform email for invites is not built yet.
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={creating || Boolean(revokingId)}
            className="rounded-xl border border-gray-300 bg-white text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
