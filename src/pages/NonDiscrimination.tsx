import { LegalPageShell } from '../components/legal/LegalPageShell'
import { NON_DISCRIMINATION_TOC, NonDiscriminationContent } from '../components/legal/NonDiscriminationContent'
import Seo from '../components/Seo'

export default function NonDiscrimination() {
  return (
    <>
      <Seo
        title="Non-Discrimination Policy"
        description="Quni Living's commitment to an inclusive accommodation marketplace free from unlawful discrimination."
        canonicalPath="/non-discrimination"
      />
      <LegalPageShell
        bandTitle="Non-Discrimination Policy"
        pageTitle="Quni Living - Non-Discrimination Policy"
        toc={NON_DISCRIMINATION_TOC}
      >
        <NonDiscriminationContent />
      </LegalPageShell>
    </>
  )
}
