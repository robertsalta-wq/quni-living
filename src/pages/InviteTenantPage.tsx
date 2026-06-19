import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Seo from '../components/Seo'
import PageRouteFallback from '../components/PageRouteFallback'
import { useAuthContext } from '../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { setQuniTenantInviteContext } from '../lib/quniTenantInvite'
import { setPostAuthRedirect } from '../lib/postAuthRedirect'
import { absoluteUrl } from '../lib/site'

type ResolvedInvite = {
  property_id: string
  property_slug: string | null
  student_only: boolean
  invite_status: string
  invited_email: string | null
  invited_name: string | null
}

function inviteErrorMessage(status: string): string {
  switch (status) {
    case 'expired':
      return 'This invite link has expired. Ask your landlord to send a new one.'
    case 'revoked':
      return 'This invite is no longer active. Ask your landlord to send a new link.'
    case 'accepted':
      return 'This invite has already been used. If you still need to book, open the listing on Quni or ask your landlord for a new invite.'
    case 'invalid':
    default:
      return 'This invite link is not valid. Check the URL or ask your landlord to send a fresh link.'
  }
}

export default function InviteTenantPage() {
  const { token: tokenParam } = useParams<{ token: string }>()
  const token = tokenParam?.trim() ?? ''
  const navigate = useNavigate()
  const { user, role, loading: authLoading } = useAuthContext()
  const [resolved, setResolved] = useState<ResolvedInvite | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(true)

  useEffect(() => {
    if (!token || !isSupabaseConfigured) {
      setResolveError(inviteErrorMessage('invalid'))
      setResolving(false)
      return
    }

    let cancelled = false
    ;(async () => {
      setResolving(true)
      setResolveError(null)
      try {
        const { data, error } = await supabase.rpc('resolve_tenant_invite', { p_token: token })
        if (cancelled) return
        if (error) {
          setResolveError('We could not load this invite. Please try again in a moment.')
          return
        }
        const row = Array.isArray(data) ? (data[0] as ResolvedInvite | undefined) : (data as ResolvedInvite | null)
        if (!row?.property_id || row.invite_status !== 'pending') {
          setResolveError(inviteErrorMessage(row?.invite_status ?? 'invalid'))
          return
        }
        setResolved(row)
      } catch {
        if (!cancelled) setResolveError('We could not load this invite. Please try again in a moment.')
      } finally {
        if (!cancelled) setResolving(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!resolved || authLoading || resolving) return

    setQuniTenantInviteContext(token, resolved.property_id)
    const bookingPath = `/booking/${resolved.property_id}?invite=${encodeURIComponent(token)}`
    setPostAuthRedirect(bookingPath)

    if (user && role === 'landlord') {
      return
    }

    if (user) {
      navigate(bookingPath, { replace: true })
      return
    }

    if (!user) {
      const params = new URLSearchParams()
      params.set('redirect', bookingPath)
      if (resolved.invited_email?.trim()) {
        params.set('invited_email', resolved.invited_email.trim())
      }
      if (resolved.invited_name?.trim()) {
        params.set('invited_name', resolved.invited_name.trim())
      }
      navigate(`/signup?${params.toString()}`, { replace: true })
    }
  }, [resolved, user, role, authLoading, resolving, token, navigate])

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center text-gray-600 text-sm">
        This site is not configured for invites yet.
      </div>
    )
  }

  if (resolving || (resolved && user && role !== 'landlord') || (resolved && !user)) {
    return (
      <>
        <Seo title="Invite" noindex description="Tenant invite on Quni Living." />
        <PageRouteFallback />
      </>
    )
  }

  if (resolveError || !resolved) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <Seo title="Invite unavailable" noindex description="Tenant invite on Quni Living." />
        <h1 className="text-xl font-semibold text-gray-900 mb-3">Invite unavailable</h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          {resolveError ?? inviteErrorMessage('invalid')}
        </p>
        <Link to="/listings" className="text-sm font-medium text-[#FF6F61] hover:underline">
          Browse listings
        </Link>
      </div>
    )
  }

  if (user && role === 'landlord') {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <Seo title="Tenant invite" noindex description="Tenant invite on Quni Living." />
        <h1 className="text-xl font-semibold text-gray-900 mb-3">Share this link with your tenant</h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          You are signed in as a landlord. This invite is for renters completing the standard verification and
          booking flow.
        </p>
        <p className="text-xs text-gray-500 break-all mb-6">{absoluteUrl(`/invite/${token}`)}</p>
        <Link to="/landlord/dashboard" className="text-sm font-medium text-[#FF6F61] hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <>
      <Seo title="Invite" noindex description="Tenant invite on Quni Living." />
      <PageRouteFallback />
    </>
  )
}
