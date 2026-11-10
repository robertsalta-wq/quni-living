import { Link } from 'react-router-dom'
import { usePlatformFeatures } from '../../context/PlatformFeaturesContext'
import { LegalDocumentModal } from '../legal/LegalDocumentModal'
import {
  VERIFICATION_CHECKLIST_MODAL_SUBTITLE,
  VERIFICATION_CHECKLIST_MODAL_TITLES,
  VerificationChecklistModalBody,
  type VerificationChecklistFocus,
} from './verificationChecklistShared'

type Props = {
  open: boolean
  onClose: () => void
  focus: VerificationChecklistFocus
}

export default function VerificationChecklistModal({ open, onClose, focus }: Props) {
  const { pricingV2Enabled } = usePlatformFeatures()
  const fullPageHref =
    focus === 'overview'
      ? '/verification'
      : focus === 'students'
        ? '/verification#students'
        : focus === 'working-tenants'
          ? '/verification#working-tenants'
          : '/verification#landlords'

  return (
    <LegalDocumentModal
      open={open}
      onClose={onClose}
      title={VERIFICATION_CHECKLIST_MODAL_TITLES[focus]}
      subtitle={
        pricingV2Enabled
          ? 'You can browse before you finish verification. Renting is free for renters. Landlords pay $5.50 including GST for each rented month, once, when the lease is signed.'
          : VERIFICATION_CHECKLIST_MODAL_SUBTITLE
      }
    >
      <VerificationChecklistModalBody focus={focus} />
      <p className="mt-8 border-t border-stone-100 pt-6 text-sm text-stone-600">
        <Link
          to={fullPageHref}
          onClick={onClose}
          className="font-medium text-[var(--quni-coral)] hover:underline"
        >
          View full verification checklist
        </Link>
      </p>
    </LegalDocumentModal>
  )
}
