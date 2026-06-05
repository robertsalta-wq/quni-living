import { Link } from 'react-router-dom'
import { LegalH2, LegalP, LegalPageShell, type LegalTocItem } from '../components/legal/LegalPageShell'
import Seo from '../components/Seo'

const TOC: LegalTocItem[] = [
  { id: 'commitment', label: 'Our commitment' },
  { id: 'what-this-means', label: 'What this means' },
  { id: 'listings', label: 'Listings and communication' },
  { id: 'exceptions', label: 'Limited legal exceptions' },
  { id: 'enforce', label: 'How we enforce this' },
  { id: 'reporting', label: 'Reporting' },
  { id: 'agreement', label: 'Agreement' },
]

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
        pageTitle="Quni Living — Non-Discrimination Policy"
        toc={TOC}
      >
        <LegalH2 id="commitment">Our commitment</LegalH2>
        <LegalP>
          Quni Living is an inclusive platform. Everyone who uses Quni — renters and landlords alike — deserves to be
          treated fairly and with respect. We are committed to providing a marketplace free from unlawful
          discrimination, in line with the Racial Discrimination Act 1975 (Cth), the Sex Discrimination Act 1984 (Cth),
          the Disability Discrimination Act 1992 (Cth), the Age Discrimination Act 2004 (Cth), and the
          anti-discrimination and equal opportunity laws of each Australian state and territory in which we operate.
        </LegalP>

        <LegalH2 id="what-this-means">What this means</LegalH2>
        <LegalP>
          When choosing, accepting, declining, or otherwise dealing with another user, you must not treat them
          unfavourably because of a protected attribute. This includes both direct discrimination (treating someone less
          favourably because of a protected attribute) and indirect discrimination (imposing an unreasonable condition
          or requirement that unfairly disadvantages a protected group). Protected attributes include, but are not
          limited to: race, colour, nationality, descent, or national or ethnic origin; religion, religious belief, or
          religious activity; sex, gender identity, gender expression, or intersex status; sexual orientation, or lawful
          sexual activity; marital, relationship, or family status, pregnancy, or breastfeeding; disability (including
          physical, intellectual, psychiatric, or sensory disability); age; political belief or activity; and source of
          income, profession, or employment status, including the receipt of government benefits. This applies to
          landlords selecting renters, to renters seeking co-tenants, to the content of all listings and messages, and to
          all interactions on the platform.
        </LegalP>

        <LegalH2 id="listings">Listings and communication</LegalH2>
        <LegalP>
          Listings, messages, and any other content on Quni must not state or imply a preference for or against users
          on the basis of a protected attribute — for example, wording such as &quot;no international students&quot; or
          &quot;working professionals only&quot;, or any phrasing that arbitrarily excludes a particular group. Landlords
          may set legitimate, functional requirements for a tenancy — for example, affordability for the advertised
          rent, a non-smoking household, or a minimum lease length. What is not permitted is excluding people on the
          basis of a protected attribute, or using wording that signals such a preference indirectly.
        </LegalP>

        <LegalH2 id="exceptions">Limited legal exceptions</LegalH2>
        <LegalP>
          Some anti-discrimination laws contain narrow exceptions for accommodation shared with a live-in owner or
          resident provider. Where such an exception applies by law, it relates strictly to a resident provider&apos;s
          choice of who they share their home with. It does not authorise the use of discriminatory or exclusionary
          language in public listings, nor does it apply to any standard tenancy that Quni manages on a landlord&apos;s
          behalf. Quni expects all users to engage respectfully regardless of the living arrangement.
        </LegalP>

        <LegalH2 id="enforce">How we enforce this</LegalH2>
        <LegalP>
          We take this policy seriously. If a user breaches it, we may take action including issuing a warning, removing
          content, restricting platform features, or suspending or permanently closing the account.
        </LegalP>

        <LegalH2 id="reporting">Reporting</LegalH2>
        <LegalP>
          If you believe you have experienced or witnessed discrimination on Quni, please contact us at{' '}
          <a
            href="mailto:hello@quni.com.au"
            className="text-[#FF6F61] font-medium underline underline-offset-2 hover:opacity-90"
          >
            hello@quni.com.au
          </a>
          . Reports are treated confidentially, investigated promptly, and handled in accordance with our{' '}
          <Link to="/privacy" className="text-[#FF6F61] font-medium underline underline-offset-2 hover:opacity-90">
            Privacy Policy
          </Link>
          .
        </LegalP>

        <LegalH2 id="agreement">Agreement</LegalH2>
        <LegalP>
          By creating an account, listing a property, or otherwise using Quni&apos;s platform and services, all users —
          landlords and renters — confirm they have read, understood, and agree to comply with this policy.
        </LegalP>
      </LegalPageShell>
    </>
  )
}
