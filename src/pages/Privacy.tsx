import Seo from '../components/Seo'
import { LegalPageShell } from '../components/legal/LegalPageShell'
import { PRIVACY_TOC, PrivacyContent } from '../components/legal/PrivacyContent'

export default function Privacy() {
  return (
    <>
      <Seo
        title="Privacy Policy"
        description="How Quni Living collects, uses, and protects your personal information when you use our verified accommodation marketplace."
        canonicalPath="/privacy"
      />
      <LegalPageShell bandTitle="Privacy Policy" pageTitle="Privacy Policy" toc={PRIVACY_TOC}>
        <PrivacyContent />
      </LegalPageShell>
    </>
  )
}
