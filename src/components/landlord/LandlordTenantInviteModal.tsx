import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { absoluteUrl } from '../../lib/site'
import { generateTenantInviteTokenPair } from '../../lib/tenantInviteToken'
import { sendTenantInviteEmail } from '../../lib/tenantInviteEmail'
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
  inviteId: string
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

function formatEmailSentAt(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}

export default function LandlordTenantInviteModal({ open, property, landlordProfileId, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdInvite, setCreatedInvite] = useState<CreatedInvite | null>(null)
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [pendingInvites, setPendingInvites] = useState<TenantInviteRow[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [rotatingId, setRotatingId] = useState<string | null>(null)
  const [emailingId, setEmailingId] = useState<string | null>(null)
  const [rotatedUrl, setRotatedUrl] = useState<{ inviteId: string; url: string } | null>(null)

  const studentOnly = property ? !property.open_to_non_students : false
  const emailTrimmed = email.trim()
  const canSendEmail = Boolean(emailTrimmed)

  const loadPendingInvites = useCallback(async () => {
    if (!property?.id) return
    setLoadingInvites(true)
    try {
      const { data, error } = await supabase
        .from('tenant_invites')
        .select('id, invited_email, invited_name, status, expires_at, email_sent_at, created_at')
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
    setEmailSentTo(null)
    setCopySuccess(false)
    void loadPendingInvites()
  }, [open, property, loadPendingInvites])

  async function insertInvite(): Promise<CreatedInvite> {
    if (!property || !landlordProfileId) throw new Error('Missing listing context')
    const { raw, hash } = await generateTenantInviteTokenPair()
    const { data: inserted, error } = await supabase
      .from('tenant_invites')
      .insert({
        property_id: property.id,
        landlord_id: landlordProfileId,
        invited_email: emailTrimmed || null,
        invited_name: name.trim() || null,
        landlord_note: note.trim() || null,
        token_hash: hash,
        status: 'pending',
      })
      .select('id')
      .single()
    if (error) throw error
    if (!inserted?.id) throw new Error('Invite was not created.')
    const url = absoluteUrl(`/invite/${raw}`)
    return { inviteId: inserted.id, rawToken: raw, url }
  }

  async function handleCreateLinkOnly(e: React.FormEvent) {
    e.preventDefault()
    if (!property || !landlordProfileId) return
    setCreating(true)
    setCreateError(null)
    setCreatedInvite(null)
    setEmailSentTo(null)
    try {
      const created = await insertInvite()
      setCreatedInvite(created)
      await loadPendingInvites()
    } catch (err) {
      setCreateError(messageFromSupabaseError(err))
    } finally {
      setCreating(false)
    }
  }

  async function handleCreateAndEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!property || !landlordProfileId || !canSendEmail) return
    setCreating(true)
    setCreateError(null)
    setCreatedInvite(null)
    setEmailSentTo(null)
    let created: CreatedInvite | null = null
    try {
      created = await insertInvite()
      setCreatedInvite(created)
      const sent = await sendTenantInviteEmail({
        inviteId: created.inviteId,
        inviteUrl: created.url,
        toEmail: emailTrimmed,
      })
      setEmailSentTo(sent.emailedTo)
      await loadPendingInvites()
    } catch (err) {
      const msg = err instanceof Error ? err.message : messageFromSupabaseError(err)
      setCreateError(
        created ? `${msg} The invite was created — you can still copy the link below.` : msg,
      )
      if (created) setCreatedInvite(created)
      await loadPendingInvites()
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

  async function emailAgain(invite: TenantInviteRow) {
    const to = invite.invited_email?.trim()
    if (!to) {
      setCreateError('Add an email on a new invite to use email delivery.')
      return
    }
    setEmailingId(invite.id)
    setCreateError(null)
    try {
      const sent = await sendTenantInviteEmail({ inviteId: invite.id, toEmail: to })
      setEmailSentTo(sent.emailedTo)
      if (sent.rotated) {
        setCreateError(null)
      }
      await loadPendingInvites()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : messageFromSupabaseError(err))
    } finally {
      setEmailingId(null)
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
          if (!creating && !revokingId && !emailingId) onClose()
        }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900">Invite a tenant</h3>
        <p className="mt-1 text-sm text-gray-600">
          Share a link or email for <span className="font-medium text-gray-900">{property.title}</span>. Your tenant
          completes the same verification and booking steps as any other renter on Quni.
        </p>

        {studentOnly && (
          <p className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-gray-700">
            This room is for students only, so anyone you invite will need to verify as a student.
          </p>
        )}

        <form className="mt-4 space-y-3" onSubmit={(e) => void handleCreateAndEmail(e)}>
          <div>
            <label htmlFor="invite-email" className="block text-xs font-medium text-gray-700 mb-1">
              Tenant email
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Send invite by email, or leave blank for link only"
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
          {emailSentTo && (
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              Invite email sent to <span className="font-medium">{emailSentTo}</span>.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={creating || !landlordProfileId || !canSendEmail}
              className="flex-1 rounded-xl bg-[#FF6F61] text-white py-2.5 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-60"
            >
              {creating && canSendEmail ? 'Sending…' : 'Send invite email'}
            </button>
            <button
              type="button"
              disabled={creating || !landlordProfileId}
              onClick={(e) => void handleCreateLinkOnly(e)}
              className="flex-1 rounded-xl border border-gray-300 bg-white text-gray-800 py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
            >
              {creating && !canSendEmail ? 'Generating…' : 'Copy link only'}
            </button>
          </div>
        </form>

        {createdInvite && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
            <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">Copy this link now</p>
            <p className="text-xs text-emerald-800">
              For security we only store a hash of the token. This is the only time the full link is shown unless you
              email a fresh link from pending invites.
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
                const hasEmail = Boolean(inv.invited_email?.trim())
                const emailedAt = formatEmailSentAt(inv.email_sent_at)
                return (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">{label}</p>
                      <p className="text-xs text-gray-500">Expires {formatInviteExpiry(inv.expires_at)}</p>
                      {emailedAt ? (
                        <p className="text-xs text-indigo-700 mt-0.5">Emailed {emailedAt}</p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">Link only — not emailed yet</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                      {hasEmail && (
                        <button
                          type="button"
                          onClick={() => void emailAgain(inv)}
                          disabled={emailingId === inv.id}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
                        >
                          {emailingId === inv.id ? 'Sending…' : 'Email again'}
                        </button>
                      )}
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
            Email again sends a fresh link and invalidates the previous one. Copy again does the same for manual sharing.
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={creating || Boolean(revokingId) || Boolean(emailingId)}
            className="rounded-xl border border-gray-300 bg-white text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
