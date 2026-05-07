import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import { ORGANIZATION_EMAIL } from '../lib/site'

/**
 * Placeholder until policy prose in tmp/content-sweep-drafts.md is approved and pasted here.
 */
export default function Refunds() {
  return (
    <>
      <Seo
        title="Refund Policy — Quni Living"
        description="Refund rules for fees and tenancy money Quni custodies. Full policy copy is being published."
        canonicalPath="/refunds"
      />
      <div className="flex min-h-0 w-full flex-1 flex-col bg-white">
        <PageHeroBand title="Refund Policy" subtitle="Detailed tables are being finalised for publication on this page." />
        <article className="max-w-site mx-auto w-full px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl space-y-4 text-sm leading-relaxed text-gray-700">
            <p>
              We&apos;re preparing the full Refund Policy that covers Quni Listing and Quni Managed. For urgent payment or
              refund questions, email{' '}
              <a href={`mailto:${ORGANIZATION_EMAIL}`} className="font-medium text-[#FF6F61] underline hover:opacity-90">
                {ORGANIZATION_EMAIL}
              </a>
              .
            </p>
          </div>
        </article>
      </div>
    </>
  )
}
