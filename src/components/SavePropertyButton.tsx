import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useSavedProperties } from '../context/SavedPropertiesContext'
import { setPendingSavePropertyId } from '../lib/savedProperties'
import { setPostAuthRedirect } from '../lib/postAuthRedirect'

type Variant = 'card' | 'detail'

type Props = {
  propertyId: string
  /** Listing path for post-auth return (e.g. `/properties/slug`). */
  listingPath: string
  variant?: Variant
  className?: string
}

export function SavePropertyButton({
  propertyId,
  listingPath,
  variant = 'card',
  className = '',
}: Props) {
  const navigate = useNavigate()
  const { canUseSave, isSaved, toggleSave } = useSavedProperties()

  if (!canUseSave) return null

  const saved = isSaved(propertyId)
  const label = saved ? 'Saved' : 'Save property'

  const onClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    void (async () => {
      const result = await toggleSave(propertyId)
      if (result !== 'needs_auth') return
      setPendingSavePropertyId(propertyId)
      setPostAuthRedirect(listingPath)
      const encoded = encodeURIComponent(listingPath)
      navigate(`/login?redirect=${encoded}`)
    })()
  }

  if (variant === 'detail') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={label}
        className={[
          'flex w-full items-center justify-center gap-2 rounded-xl border-2 py-3.5 text-sm font-semibold tracking-wide transition-colors',
          saved
            ? 'border-[var(--quni-coral)] bg-admin-coral/10 text-[var(--quni-coral)]'
            : 'border-stone-200 bg-white text-stone-700 hover:border-admin-coral/50 hover:text-[var(--quni-coral)]',
          className,
        ].join(' ')}
      >
        <Heart className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} aria-hidden />
        {saved ? 'Saved' : 'Save property'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      className={[
        'absolute top-3 right-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-stone-700 shadow-sm backdrop-blur-sm transition-colors hover:text-[var(--quni-coral)]',
        saved ? 'text-[var(--quni-coral)]' : '',
        className,
      ].join(' ')}
    >
      <Heart className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} strokeWidth={2} aria-hidden />
    </button>
  )
}
