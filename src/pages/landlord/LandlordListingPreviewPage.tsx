import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Pencil } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import { useSetAppChromeActions, type AppActionBarItem } from '../../components/appShell/AppChromeActionsContext'
import LandlordAuthorityToLetModal from '../../components/landlord/LandlordAuthorityToLetModal'
import LandlordListingPublishButton from '../../components/landlord/listings/LandlordListingPublishButton'
import Seo from '../../components/Seo'
import { listingPreviewActionBarItemSpecs } from '../../lib/appChromeBarItems'
import {
  listingActionsFromPageSnapshot,
  listingPageShowsPublishButton,
} from '../../lib/listingPagePublish'
import { listingHubPath } from '../../lib/listingEditHubHealth'
import { loadPropertyDetailById } from '../../lib/propertyDetailCache'
import { isSupabaseConfigured } from '../../lib/supabase'
import type { Property } from '../../lib/listings'
import { useLandlordPropertyListingActions } from '../../hooks/useLandlordPropertyListingActions'
import PropertyDetail from '../PropertyDetail'

/**
 * Owner/admin-only listing preview. Uses the public listing layout with Apply/Share off.
 * First publish happens here. Not indexed.
 */
export default function LandlordListingPreviewPage() {
  const { id: propertyId } = useParams<{ id: string }>()
  const { role } = useAuthContext()
  const navigate = useNavigate()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publishMessage, setPublishMessage] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  )

  const showPublishToast = useCallback((t: { kind: 'success' | 'error'; message: string }) => {
    setPublishMessage(t)
  }, [])

  const reload = useCallback(async () => {
    if (!propertyId || !isSupabaseConfigured) {
      setProperty(null)
      setLoading(false)
      setError(propertyId ? 'Configure Supabase to preview this listing.' : 'Listing not found.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const row = await loadPropertyDetailById(propertyId)
      if (!row) {
        setProperty(null)
        setError('Listing not found.')
        return
      }
      setProperty(row)
    } catch (e) {
      setProperty(null)
      setError(e instanceof Error ? e.message : 'Could not load this listing.')
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    void reload()
  }, [reload])

  const {
    publishingListingId,
    attestingListingId,
    authorityToLetPending,
    setAuthorityToLetPending,
    publishDraftListing,
    confirmAuthorityToLetAttestation,
  } = useLandlordPropertyListingActions({
    reload,
    navigate,
    showToast: showPublishToast,
  })

  const canPublish = listingPageShowsPublishButton({
    status: property?.status,
    role,
    hasSavedProperty: Boolean(property?.id),
  })
  const listingForPublish = property
    ? listingActionsFromPageSnapshot({
        id: property.id,
        title: property.title,
        slug: property.slug,
        status: property.status,
        authorityToLetAttestedAt: property.authority_to_let_attested_at,
        serviceTier: property.service_tier,
        openToNonStudents: Boolean(property.open_to_non_students),
        rentPerWeek: property.rent_per_week,
        maxOccupants: property.max_occupants,
        coupleSurchargePerWeek: property.couple_surcharge_per_week,
        parkingSurchargePerWeek: property.parking_surcharge_per_week,
        parkingAvailable: Boolean(property.parking_available),
        state: property.state,
        propertyType: property.property_type,
        isRegisteredRoomingHouse: Boolean(property.is_registered_rooming_house),
        listerRole: property.lister_role,
      })
    : null

  const editHref = listingHubPath({ propertyId: propertyId ?? null })
  const publishing = Boolean(propertyId && publishingListingId === propertyId)

  const chromeItems: AppActionBarItem[] = useMemo(
    () =>
      listingPreviewActionBarItemSpecs({ canPublish, publishing }).map((spec) => ({
        ...spec,
        icon: spec.id === 'publish' ? Check : Pencil,
        ...(spec.id === 'edit' ? { to: editHref } : {}),
        ...(spec.id === 'publish' && listingForPublish
          ? {
              onClick: () => {
                setPublishMessage(null)
                void publishDraftListing(listingForPublish)
              },
            }
          : {}),
      })),
    [canPublish, publishing, editHref, listingForPublish, publishDraftListing],
  )
  useSetAppChromeActions(chromeItems)

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[var(--quni-surface-2)] p-8 text-sm text-[var(--quni-ink-4)]">
        Loading preview…
      </div>
    )
  }

  if (error || !property) {
    return (
      <>
        <Seo title="Preview listing" noindex description="This listing preview is not available." />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[var(--quni-surface-2)] p-8 text-center">
          <p className="text-sm text-[var(--quni-danger-fg)]">{error ?? 'Listing not found.'}</p>
          <Link
            to={editHref}
            className="rounded-lg bg-[var(--quni-coral)] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to listing
          </Link>
        </div>
      </>
    )
  }

  const isDraft = property.status === 'draft'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Seo title="Preview listing" noindex description="Owner preview of a Quni listing. Not public." />
      <div className="sticky top-0 z-30 border-b border-[var(--quni-line-soft)] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5">
          <span className="rounded-full border border-[var(--quni-cream-border)] bg-[var(--quni-cream)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[#5C5326]">
            {isDraft ? 'Draft preview' : 'Listing preview'}
          </span>
          <p className="min-w-0 flex-1 text-[12.5px] text-[var(--quni-ink-4)]">
            {isDraft
              ? 'This is how students will see your listing. It is not public until you publish.'
              : 'This is how students see your listing.'}
          </p>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <Link
              to={editHref}
              className="inline-flex items-center rounded-[10px] border border-[var(--quni-input-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--quni-navy)] hover:bg-[var(--quni-surface-3)]"
            >
              Edit
            </Link>
            {canPublish && listingForPublish ? (
              <LandlordListingPublishButton
                busy={publishing}
                onClick={() => {
                  setPublishMessage(null)
                  void publishDraftListing(listingForPublish)
                }}
                className="inline-flex h-10 min-w-[7.5rem] items-center justify-center rounded-[10px] bg-[var(--quni-coral)] px-4 text-sm font-semibold text-white hover:bg-[var(--quni-coral-hover)] disabled:opacity-50"
              />
            ) : null}
          </div>
        </div>
        {publishMessage?.kind === 'error' ? (
          <p className="px-4 pb-2 text-center text-sm text-[var(--quni-danger-fg)]" role="alert">
            {publishMessage.message}
          </p>
        ) : null}
      </div>

      <PropertyDetail ownerPreviewListing={property} />

      <LandlordAuthorityToLetModal
        open={authorityToLetPending != null}
        intent={authorityToLetPending?.intent ?? 'publish'}
        listingTitle={authorityToLetPending?.property.title ?? ''}
        busy={
          authorityToLetPending != null &&
          (attestingListingId === authorityToLetPending.property.id ||
            publishingListingId === authorityToLetPending.property.id)
        }
        onConfirm={() => void confirmAuthorityToLetAttestation()}
        onCancel={() => {
          if (attestingListingId === authorityToLetPending?.property.id) return
          setAuthorityToLetPending(null)
        }}
      />
      {publishMessage?.kind === 'success' ? (
        <div
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[60] w-[min(100%-2rem,28rem)] -translate-x-1/2 px-4 sm:bottom-6"
          role="status"
        >
          <div className="rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">
            {publishMessage.message}
          </div>
        </div>
      ) : null}
    </div>
  )
}
