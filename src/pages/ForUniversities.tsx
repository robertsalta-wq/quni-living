import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import { DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_ALT } from '../lib/site'
import './forUniversities.css'

const BODY_CLASS = 'for-universities-page'

const SEO_TITLE = 'University partnerships'
const SEO_DESCRIPTION =
  'Partnership overview for university accommodation and international offices. A fair, verified place to send your international students.'

export default function ForUniversities() {
  useEffect(() => {
    document.body.classList.add(BODY_CLASS)
    return () => document.body.classList.remove(BODY_CLASS)
  }, [])

  return (
    <>
      <Seo
        title={SEO_TITLE}
        description={SEO_DESCRIPTION}
        canonicalPath="/for-universities"
        image={DEFAULT_OG_IMAGE}
        imageAlt={DEFAULT_OG_IMAGE_ALT}
      />
      <div className="for-universities-shell mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <article className="for-universities-doc">
          <button type="button" className="partnership-print-btn" onClick={() => window.print()}>
            Print
          </button>

          <div className="partnership-credential">
            Licensed real estate agency &nbsp;·&nbsp; Managed tenancies operate under the relevant Residential
            Tenancies Act and anti-discrimination law
          </div>

          <div className="partnership-masthead">
            <div className="partnership-logo">
              <img
                src="/quni-logo.png"
                srcSet="/quni-logo.png 1x, /quni-logo@2x.png 2x"
                alt="Quni"
                width={120}
                height={40}
              />
            </div>
            <div className="partnership-eyebrow">
              Partnership overview for university
              <br />
              accommodation &amp; international offices
            </div>
          </div>

          <p className="partnership-lede">A fair, verified place to send your international students.</p>

          <h2 className="partnership-section-title">The problem your students keep running into</h2>
          <p>
            International students do some of the hardest renting in Australia. They arrive without a local rental
            history, often without a local guarantor, and into a private market where the bias against them is rarely
            stated out loud. They simply don&apos;t get the callback. The law protects them against discrimination on
            the basis of national origin and immigrant status, but enforcement is reactive: it relies on a student
            seeing and proving a bias that, by its nature, happens quietly inside someone else&apos;s selection
            process.
          </p>
          <p>
            That gap lands on your desk: as accommodation complaints, as students in unsafe or exploitative
            arrangements, and as a welfare and duty-of-care concern you&apos;re expected to stay ahead of.
          </p>

          <h2 className="partnership-section-title">How Quni is built differently</h2>
          <p>
            Quni Living is a managed student-accommodation marketplace. Two design choices make it a referral your
            office can stand behind.
          </p>

          <div className="partnership-pillars">
            <div className="partnership-pillar">
              <h3>1. Fairness by architecture, enforced in code</h3>
              <p>
                The AI tools that help assess students, reply to enquiries and answer their questions{' '}
                <strong>
                  never receive a student&apos;s nationality, gender, residency status, or date of birth.
                </strong>{' '}
                Those attributes are stripped in the code itself before the tools can use them, deterministically and
                failing closed, so anything not explicitly permitted is withheld by default. It&apos;s proven by
                automated tests and live adversarial probes that try to reintroduce those attributes and confirm they
                can&apos;t get through.
              </p>
              <p className="partnership-pillar-audit">
                And it&apos;s auditable. Every booking generates an{' '}
                <strong>immutable, tamper-evident compliance record</strong> showing those protected attributes
                weren&apos;t used, and a booking cannot complete without one. If a decision is ever questioned,
                there&apos;s a record of how it was actually made.
              </p>
            </div>
            <div className="partnership-pillar">
              <h3>2. Verification: students arrive trusted</h3>
              <p>
                Every student verifies up front: university email confirmation, government photo ID, and proof of
                enrolment.
              </p>
              <p>
                That addresses the legitimate concerns a landlord is allowed to have, and shifts the conversation onto
                a student&apos;s actual suitability, so they&apos;re judged on merit, not sorted by origin.
              </p>
              <p className="partnership-pillar-audit">
                Together, fairness and verification do the same job from both ends: the system won&apos;t hold the
                wrong things against a student, and it gives landlords the right things to say yes to.
              </p>
            </div>
          </div>

          <h2 className="partnership-section-title">Why this matters to your office</h2>
          <div className="partnership-cols">
            <ul>
              <li>
                <strong>A referral you can defend.</strong> The matching tools are structurally barred, in code, from
                using protected attributes, and every decision leaves a tamper-evident record. Not an open market where
                you have no visibility.
              </li>
              <li>
                <strong>Fewer downstream problems.</strong> Verified students and managed, on-the-record tenancies
                mean fewer of the disputes and unsafe arrangements that become accommodation complaints.
              </li>
              <li>
                <strong>Supports your welfare and duty-of-care commitments.</strong> Fair, transparent, documented
                housing pathways align with the welfare expectations placed on education providers.
              </li>
              <li>
                <strong>Licensed and accountable.</strong> Managed tenancies are handled by a licensed real estate
                agent, under the relevant Residential Tenancies Act and anti-discrimination law.
              </li>
            </ul>
          </div>

          <h2 className="partnership-section-title">What a partnership can look like</h2>
          <div className="partnership-cols">
            <ul>
              <li>A co-branded landing page or referral link for your accommodation and international pages</li>
              <li>Inclusion in pre-arrival and orientation accommodation information</li>
              <li>Short info sessions for incoming-student cohorts</li>
              <li>A direct contact for your team on student accommodation matters</li>
            </ul>
          </div>

          <div className="partnership-scope">
            <strong>An honest note on scope.</strong> Quni is a marketplace, so the final decision on a privately
            listed room rests with the individual landlord. What we guarantee is that our own tools never receive, and
            cannot use, a student&apos;s nationality, gender, domestic/international status, or date of birth, and that
            each decision leaves a tamper-evident record proving it. We don&apos;t claim to be &quot;bias-free&quot;
            everywhere, and we don&apos;t claim our AI can&apos;t be coaxed into clumsy wording. What we claim is the
            part that&apos;s enforced deterministically in code, and we keep the records to back it.
          </div>

          <div className="partnership-doc-footer">
            <div>
              <span className="partnership-talk">Let&apos;s talk.</span>
              <span className="partnership-contact">
                {' '}
                <Link to="/contact">Contact us</Link>
                {' '}
                &nbsp;·&nbsp; quni.com.au
              </span>
            </div>
            <div className="partnership-tag">student accommodation, matched on merit</div>
          </div>
        </article>
      </div>
    </>
  )
}
