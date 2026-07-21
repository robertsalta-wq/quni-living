import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import { ORGANIZATION_EMAIL } from '../lib/site'
import { BOND_CONDUIT_VS_CUSTODY, BOND_NEUTRAL_MARKETING } from '../lib/bondPublicCopy'

const TABLE_WRAP = 'overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm'
const TH = 'border border-stone-200 bg-stone-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 sm:text-sm'
const TD = 'border border-stone-200 px-3 py-3 text-sm leading-relaxed text-gray-700 align-top'

export default function Refunds() {
  return (
    <>
      <Seo
        title="Refund Policy - Quni Living"
        description="Refunds and reversals for money Quni receives; tenancy bond and rent follow your agreement and state law."
        canonicalPath="/refunds"
      />
      <div className="flex min-h-0 w-full flex-1 flex-col bg-white">
        <PageHeroBand
          title="Refund Policy"
          subtitle="Rules for platform-side fees and payments Quni administers. Tenancy money follows your agreement and the law."
        />
        <article className="max-w-site mx-auto w-full px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl space-y-10 text-sm leading-relaxed text-gray-800">
            <section className="space-y-4">
              <p>
                Quni administers refunds and reversals for money <strong>Quni actually receives</strong> through its
                payment stack (for example booking deposits and landlord fees processed on-platform). Tenancy{' '}
                <strong>bond</strong> and <strong>rent</strong> are <strong>not</strong> Quni fees. Where bond or rent
                moves <strong>directly</strong> between landlord and renter, refund rights follow{' '}
                <strong>your tenancy agreement</strong> and <strong>state or territory law</strong>, not this policy.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
                Quni Listing - landlord acceptance fee
              </h2>
              <p>
                Applies to <strong>landlords</strong> on Quni Listing only. Renters pay <strong>no</strong> booking,
                platform, service, or surcharge fees to Quni.
              </p>
              <div className={TABLE_WRAP}>
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>Situation</th>
                      <th className={TH}>Refund of the Listing acceptance fee ($99, subject to change at booking)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={TD}>Landlord declines the booking before acceptance</td>
                      <td className={TD}>
                        <strong>Full refund</strong> of any acceptance fee charged to the landlord in line with the
                        decline flow.
                      </td>
                    </tr>
                    <tr>
                      <td className={TD}>Duplicate / erroneous charge</td>
                      <td className={TD}>
                        <strong>Full refund</strong> after verification.
                      </td>
                    </tr>
                    <tr>
                      <td className={TD}>Landlord accepted the booking; tenancy proceeds</td>
                      <td className={TD}>
                        <strong>No refund</strong> - the fee covers acceptance and platform use for that booking.
                      </td>
                    </tr>
                    <tr>
                      <td className={TD}>Tenancy unwinds after acceptance (cancellation / mutual exit)</td>
                      <td className={TD}>
                        <strong>Fee treatment</strong> depends on what was charged and why the booking unwound; contact{' '}
                        <a href={`mailto:${ORGANIZATION_EMAIL}`} className="font-medium text-[var(--quni-coral)] underline hover:opacity-90">
                          {ORGANIZATION_EMAIL}
                        </a>{' '}
                        with your booking reference.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs italic text-gray-600">
                Note: Listing acceptance fees are not yet charged automatically at landlord confirm in all flows; until
                billing is fully wired, alignment with this table is handled case-by-case via{' '}
                <a href={`mailto:${ORGANIZATION_EMAIL}`} className="font-medium text-[var(--quni-coral)] underline hover:opacity-90">
                  {ORGANIZATION_EMAIL}
                </a>
                .
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
                Quni Managed - tenancy money Quni routes
              </h2>
              <p>
                Renters pay <strong>no</strong> booking, platform, service, or surcharge fees to Quni. On Managed,{' '}
                <strong>weekly rent</strong> includes a <strong>service component</strong> retained by Quni as
                disclosed on the pricing page - it is <strong>not</strong> an extra line item on top of rent charged to
                the renter.
              </p>
              <div className={TABLE_WRAP}>
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>Situation</th>
                      <th className={TH}>Deposit / rent</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={TD}>Booking declined or expires before landlord confirmation</td>
                      <td className={TD}>
                        <strong>Deposit hold released or refunded</strong> per automated flows where applicable; timing
                        follows your bank/card network (typically <strong>5–7 business days</strong>).
                      </td>
                    </tr>
                    <tr>
                      <td className={TD}>Booking confirmed; tenancy proceeds</td>
                      <td className={TD}>
                        <strong>Deposit, bond, and ongoing rent after confirmation</strong> are governed by your{' '}
                        <strong>tenancy agreement</strong>, applicable law, and the payment flows you complete at booking -{' '}
                        <strong>not fully restated in this policy.</strong> Use{' '}
                        <a href={`mailto:${ORGANIZATION_EMAIL}`} className="font-medium text-[var(--quni-coral)] underline hover:opacity-90">
                          {ORGANIZATION_EMAIL}
                        </a>{' '}
                        for questions about <strong>platform-side</strong> payments or reversals.
                      </td>
                    </tr>
                    <tr>
                      <td className={TD}>Booking cancelled after landlord confirmation</td>
                      <td className={TD}>
                        Same as row above: outcomes depend on tenancy terms, timing, and what has already been captured or
                        paid - contact{' '}
                        <a href={`mailto:${ORGANIZATION_EMAIL}`} className="font-medium text-[var(--quni-coral)] underline hover:opacity-90">
                          {ORGANIZATION_EMAIL}
                        </a>{' '}
                        for platform administration; bond and rent disputes outside money Quni custodies follow tribunal or
                        authority processes.
                      </td>
                    </tr>
                    <tr>
                      <td className={TD}>Charge error / duplicate</td>
                      <td className={TD}>Corrected after verification.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-stone-100 bg-[var(--quni-trust-bg)] px-4 py-5 sm:px-6">
              <h2 className="font-display text-lg font-bold text-gray-900">Bond refunds</h2>
              <p className="text-gray-700">
                Cash bonds and tribunal outcomes are governed by <strong>state or territory residential laws</strong> and{' '}
                <strong>bond authorities</strong>. <strong>Quni does not set bond refund outcomes</strong> and does not
                replace tribunal processes.
              </p>
              <p className="text-gray-700">{BOND_NEUTRAL_MARKETING}</p>
              <p className="text-gray-700">{BOND_CONDUIT_VS_CUSTODY}</p>
            </section>

            <section className="border-t border-stone-200 pt-8 text-xs text-gray-500">
              <p>
                Questions:{' '}
                <a href={`mailto:${ORGANIZATION_EMAIL}`} className="font-medium text-[var(--quni-coral)] underline hover:opacity-90">
                  {ORGANIZATION_EMAIL}
                </a>
              </p>
            </section>
          </div>
        </article>
      </div>
    </>
  )
}
