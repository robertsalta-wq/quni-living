import Seo from '../components/Seo'
import { LegalPageShell } from '../components/legal/LegalPageShell'
import { TERMS_TOC, TermsContent } from '../components/legal/TermsContent'

export default function Terms() {
  return (
    <>
      <Seo
        title="Terms of Service"
        description="Terms of Service for the Quni Living accommodation marketplace - accounts, listings, bookings, and acceptable use."
        canonicalPath="/terms"
      />
      <LegalPageShell bandTitle="Terms of Service" pageTitle="Platform Terms of Service" toc={TERMS_TOC}>
        <TermsContent />
      </LegalPageShell>
    </>
  )
}
