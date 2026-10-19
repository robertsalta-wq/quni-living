import { type ReactNode, useState } from 'react'
import { LEGAL_DOC_LINK_CLASS, LegalDocumentModal } from './LegalDocumentModal'
import { NonDiscriminationContent } from './NonDiscriminationContent'

type NonDiscriminationPolicyModalLinkProps = {
  children: ReactNode
  className?: string
}

/** Opens the Non-Discrimination Policy in a modal instead of a new tab. Safe inside consent labels. */
export function NonDiscriminationPolicyModalLink({
  children,
  className = LEGAL_DOC_LINK_CLASS,
}: NonDiscriminationPolicyModalLinkProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={`relative z-[1] ${className}`}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {children}
      </button>
      <LegalDocumentModal open={open} onClose={() => setOpen(false)} title="Non-Discrimination Policy">
        <NonDiscriminationContent />
      </LegalDocumentModal>
    </>
  )
}
