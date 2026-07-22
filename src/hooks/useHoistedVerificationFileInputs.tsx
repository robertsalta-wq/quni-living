import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { VERIFICATION_ID_FILE_ACCEPT } from '../lib/verificationDocUpload'
import type { VerificationDocKind } from '../lib/verificationDocSlot'

const ACCEPT_BY_KIND: Record<VerificationDocKind, string> = {
  id: VERIFICATION_ID_FILE_ACCEPT,
  enrolment: 'image/*,application/pdf',
  identity_supporting: 'image/*,application/pdf',
}

const KEY_BY_KIND: Record<VerificationDocKind, string> = {
  id: 'verif-input-id',
  enrolment: 'verif-input-enrolment',
  identity_supporting: 'verif-input-identity-supporting',
}

const ARIA_LABEL_BY_KIND: Record<VerificationDocKind, string> = {
  id: 'Upload government photo ID',
  enrolment: 'Upload proof of enrolment',
  identity_supporting: 'Upload supporting document',
}

export type VerificationFilePickSlot = {
  kind: VerificationDocKind
  pick: (file: File) => void
}

/**
 * Hoists hidden file inputs to a stable root so volatile card re-renders (preview
 * fetches, profile refetch) never remount the input — which on Android Chrome
 * drops the picker's change event. Native change listeners + pendingPick recovery
 * match StudentVerificationPanel (Jun 2026 mobile fix).
 */
export function useHoistedVerificationFileInputs(slots: VerificationFilePickSlot[]) {
  const idInputRef = useRef<HTMLInputElement>(null)
  const enrolInputRef = useRef<HTMLInputElement>(null)
  const identitySupportInputRef = useRef<HTMLInputElement>(null)

  const refForKind = useCallback((kind: VerificationDocKind): RefObject<HTMLInputElement | null> => {
    switch (kind) {
      case 'id':
        return idInputRef
      case 'enrolment':
        return enrolInputRef
      case 'identity_supporting':
        return identitySupportInputRef
    }
  }, [])

  const picksRef = useRef(slots)
  picksRef.current = slots

  const pendingPick = useRef<{ kind: VerificationDocKind; el: HTMLInputElement } | null>(null)

  const processPickedFile = useCallback((kind: VerificationDocKind, input: HTMLInputElement) => {
    pendingPick.current = null
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    picksRef.current.find((s) => s.kind === kind)?.pick(file)
  }, [])

  const slotKindsKey = slots
    .map((s) => s.kind)
    .sort()
    .join(',')

  useEffect(() => {
    const activeKinds = new Set(slots.map((s) => s.kind))
    const entries: Array<[RefObject<HTMLInputElement | null>, VerificationDocKind]> = []
    if (activeKinds.has('id')) entries.push([idInputRef, 'id'])
    if (activeKinds.has('enrolment')) entries.push([enrolInputRef, 'enrolment'])
    if (activeKinds.has('identity_supporting')) entries.push([identitySupportInputRef, 'identity_supporting'])

    const cleanups = entries.map(([ref, kind]) => {
      const el = ref.current
      if (!el) return null
      const handler = () => processPickedFile(kind, el)
      el.addEventListener('change', handler)
      return () => el.removeEventListener('change', handler)
    })

    const recoverPendingPick = () => {
      if (!pendingPick.current) return
      window.setTimeout(() => {
        const p = pendingPick.current
        if (p && p.el.files && p.el.files.length > 0) processPickedFile(p.kind, p.el)
      }, 500)
    }
    window.addEventListener('focus', recoverPendingPick)
    document.addEventListener('visibilitychange', recoverPendingPick)
    return () => {
      cleanups.forEach((fn) => fn?.())
      window.removeEventListener('focus', recoverPendingPick)
      document.removeEventListener('visibilitychange', recoverPendingPick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-bind when slot set changes; picks via ref
  }, [processPickedFile, slotKindsKey])

  const openPicker = useCallback(
    (kind: VerificationDocKind) => () => {
      const el = refForKind(kind).current
      if (!el) return
      pendingPick.current = { kind, el }
      el.click()
    },
    [refForKind],
  )

  const hoistedFileInputs = (
    <>
      {slots.map(({ kind }) => (
        <input
          key={KEY_BY_KIND[kind]}
          id={KEY_BY_KIND[kind]}
          ref={refForKind(kind)}
          type="file"
          accept={ACCEPT_BY_KIND[kind]}
          className="sr-only"
          aria-label={ARIA_LABEL_BY_KIND[kind]}
        />
      ))}
    </>
  )

  return { hoistedFileInputs, openPicker, refForKind }
}
