import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import TurnstileCaptcha from '../components/TurnstileCaptcha'
import { apiUrl } from '../lib/apiUrl'
import {
  uniCaptchaLabelClass,
  uniColsClass,
  uniContactClass,
  uniCredentialClass,
  uniCtaClass,
  uniDocClass,
  uniDocFooterClass,
  uniEnquiryClass,
  uniEnquiryCopyClass,
  uniEnquiryHeadingClass,
  uniEyebrowClass,
  uniFieldErrorClass,
  uniFormClass,
  uniFormErrorClass,
  uniFormFieldClass,
  uniFormSuccessClass,
  uniInputClass,
  uniLabelClass,
  uniLedeClass,
  uniLogoClass,
  uniMastheadClass,
  uniPillarAuditClass,
  uniPillarClass,
  uniPillarsClass,
  uniPrintBtnClass,
  uniPrintContactClass,
  uniPrintOnlyClass,
  uniScopeClass,
  uniSectionTitleClass,
  uniShellClass,
  uniSubmitClass,
  uniTagClass,
  uniTalkClass,
  uniTextareaClass,
  uniWebOnlyClass,
} from '../lib/forUniversitiesClasses'
import { DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_ALT, ORGANIZATION_EMAIL } from '../lib/site'
import {
  REFERENCE_COVERAGE_CAMPUS_COUNT,
  REFERENCE_COVERAGE_UNIVERSITY_COUNT,
} from '../lib/universityCampusReference'
import { isTurnstileSiteKeyConfigured } from '../lib/verifyTurnstile'

const BODY_CLASS = 'for-universities-page'
const FORM_ID = 'partnership-form'
const PARTNERSHIP_SUBJECT = 'Partnership - University (for-universities)'

const SEO_TITLE = 'University partnerships'
const SEO_DESCRIPTION =
  'Partnership overview for university accommodation and international offices. A fair, verified place to send your international students.'

const SUCCESS_MESSAGE = "Thanks. We'll be in touch shortly about a Quni partnership."
const ERROR_MESSAGE = 'Something went wrong. Please try again, or email us directly.'

const UNIVERSITY_WIN_COPY =
  'Give your students a fair, verified alternative to a private rental market where international students are often screened out, and take routine housing queries off your office\u2019s plate.'

const COVERAGE_COPY = `Quni is built around ${REFERENCE_COVERAGE_UNIVERSITY_COUNT} universities and ${REFERENCE_COVERAGE_CAMPUS_COUNT} campuses across Australia.`

const PRINT_CONTACT_COPY = `To discuss a partnership, contact Quni Living at ${ORGANIZATION_EMAIL} or visit quni.com.au/for-universities.`

function scrollToPartnershipForm() {
  document.getElementById(FORM_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function PartnershipCtaButton() {
  return (
    <button
      type="button"
      className={`${uniCtaClass} ${uniWebOnlyClass}`}
      onClick={scrollToPartnershipForm}
    >
      Start a partnership conversation
    </button>
  )
}

function PartnershipEnquiryForm() {
  const [showCaptcha, setShowCaptcha] = useState(false)
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'name' | 'institution' | 'role' | 'email', string>>>(
    {},
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  function validate(): boolean {
    const errors: Partial<Record<'name' | 'institution' | 'role' | 'email', string>> = {}
    const n = name.trim()
    const inst = institution.trim()
    const r = role.trim()
    const em = email.trim()

    if (!n) errors.name = 'Please enter your name.'
    if (!inst) errors.institution = 'Please enter your institution.'
    if (!r) errors.role = 'Please enter your role.'
    if (!em) errors.email = 'Please enter your work email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) errors.email = 'Please enter a valid email address.'

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!validate()) return

    if (!isTurnstileSiteKeyConfigured()) {
      setFormError('This form is not available right now. Please email hello@quni.com.au directly.')
      return
    }

    if (!showCaptcha) {
      setShowCaptcha(true)
    }

    if (!captchaToken?.trim()) {
      setFormError('Please complete the verification step.')
      return
    }

    const notesTrimmed = notes.trim()
    const message = [
      `Institution: ${institution.trim()}`,
      `Your role: ${role.trim()}`,
      notesTrimmed ? `\nMessage:\n${notesTrimmed}` : '',
      '\n—\nSubmitted via /for-universities partnership form',
    ]
      .filter(Boolean)
      .join('\n')

    setSubmitting(true)
    try {
      const res = await fetch(apiUrl('/api/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: PARTNERSHIP_SUBJECT,
          message,
          turnstileToken: captchaToken,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setFormError(ERROR_MESSAGE)
        setCaptchaToken(null)
        setCaptchaResetKey((k) => k + 1)
        return
      }
      setSent(true)
      setName('')
      setInstitution('')
      setRole('')
      setEmail('')
      setNotes('')
      setCaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
    } catch {
      setFormError(ERROR_MESSAGE)
      setCaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      id={FORM_ID}
      className={`${uniEnquiryClass} ${uniWebOnlyClass}`}
      aria-labelledby="partnership-form-heading"
    >
      <h2 id="partnership-form-heading" className={uniEnquiryHeadingClass}>
        Start a partnership conversation
      </h2>
      <p className={uniEnquiryCopyClass}>{UNIVERSITY_WIN_COPY}</p>
      <p className={uniEnquiryCopyClass}>{COVERAGE_COPY}</p>

      {sent ? (
        <p className={uniFormSuccessClass} role="status">
          {SUCCESS_MESSAGE}
        </p>
      ) : (
        <form className={uniFormClass} onSubmit={handleSubmit} noValidate>
          <div className={uniFormFieldClass}>
            <label htmlFor="partnership-name" className={uniLabelClass}>
              Name
            </label>
            <input
              id="partnership-name"
              type="text"
              name="name"
              required
              autoComplete="name"
              className={uniInputClass}
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              aria-invalid={fieldErrors.name ? true : undefined}
            />
            {fieldErrors.name ? (
              <p className={uniFieldErrorClass} role="alert">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>
          <div className={uniFormFieldClass}>
            <label htmlFor="partnership-institution" className={uniLabelClass}>
              Institution
            </label>
            <input
              id="partnership-institution"
              type="text"
              name="institution"
              required
              autoComplete="organization"
              className={uniInputClass}
              value={institution}
              onChange={(ev) => setInstitution(ev.target.value)}
              aria-invalid={fieldErrors.institution ? true : undefined}
            />
            {fieldErrors.institution ? (
              <p className={uniFieldErrorClass} role="alert">
                {fieldErrors.institution}
              </p>
            ) : null}
          </div>
          <div className={uniFormFieldClass}>
            <label htmlFor="partnership-role" className={uniLabelClass}>
              Your role
            </label>
            <input
              id="partnership-role"
              type="text"
              name="role"
              required
              autoComplete="organization-title"
              className={uniInputClass}
              value={role}
              onChange={(ev) => setRole(ev.target.value)}
              aria-invalid={fieldErrors.role ? true : undefined}
            />
            {fieldErrors.role ? (
              <p className={uniFieldErrorClass} role="alert">
                {fieldErrors.role}
              </p>
            ) : null}
          </div>
          <div className={uniFormFieldClass}>
            <label htmlFor="partnership-email" className={uniLabelClass}>
              Work email
            </label>
            <input
              id="partnership-email"
              type="email"
              name="email"
              required
              autoComplete="work email"
              className={uniInputClass}
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              aria-invalid={fieldErrors.email ? true : undefined}
            />
            {fieldErrors.email ? (
              <p className={uniFieldErrorClass} role="alert">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>
          <div className={uniFormFieldClass}>
            <label htmlFor="partnership-notes" className={uniLabelClass}>
              Message
            </label>
            <textarea
              id="partnership-notes"
              name="message"
              rows={4}
              className={uniTextareaClass}
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
              placeholder="Optional — tell us what you're looking for or any questions."
            />
          </div>

          {showCaptcha ? (
            <TurnstileCaptcha
              resetKey={captchaResetKey}
              onTokenChange={setCaptchaToken}
              disabled={submitting}
              labelClassName={uniCaptchaLabelClass}
            />
          ) : null}

          {formError ? (
            <p className={uniFormErrorClass} role="alert">
              {formError}
            </p>
          ) : null}

          <button type="submit" className={uniSubmitClass} disabled={submitting}>
            {submitting ? 'Sending…' : 'Send'}
          </button>
        </form>
      )}
    </section>
  )
}

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
      <div className={uniShellClass}>
        <article className={uniDocClass}>
          <button
            type="button"
            className={`${uniPrintBtnClass} ${uniWebOnlyClass}`}
            onClick={() => window.print()}
          >
            Print
          </button>

          <div className={uniCredentialClass}>
            Licensed real estate agency &nbsp;·&nbsp; Managed tenancies operate under the relevant Residential
            Tenancies Act and anti-discrimination law
          </div>

          <div className={uniMastheadClass}>
            <div className={uniLogoClass}>
              <img
                src="/quni-logo.png"
                srcSet="/quni-logo.png 1x, /quni-logo@2x.png 2x"
                alt="Quni"
                width={120}
                height={40}
              />
            </div>
            <div className={uniEyebrowClass}>
              Partnership overview for university
              <br />
              accommodation &amp; international offices
            </div>
          </div>

          <p className={uniLedeClass}>A fair, verified place to send your international students.</p>

          <PartnershipCtaButton />

          <h2 className={uniSectionTitleClass}>The problem your students keep running into</h2>
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

          <h2 className={uniSectionTitleClass}>How Quni is built differently</h2>
          <p>
            Quni Living is a managed student-accommodation marketplace. Two design choices make it a referral your
            office can stand behind.
          </p>

          <div className={uniPillarsClass}>
            <div className={uniPillarClass}>
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
              <p className={uniPillarAuditClass}>
                And it&apos;s auditable. Every booking generates an{' '}
                <strong>immutable, tamper-evident compliance record</strong> showing those protected attributes
                weren&apos;t used, and a booking cannot complete without one. If a decision is ever questioned,
                there&apos;s a record of how it was actually made.
              </p>
            </div>
            <div className={uniPillarClass}>
              <h3>2. Verification: students arrive trusted</h3>
              <p>
                Every student verifies up front: university email confirmation, government photo ID, and proof of
                enrolment.
              </p>
              <p>
                That addresses the legitimate concerns a landlord is allowed to have, and shifts the conversation onto
                a student&apos;s actual suitability, so they&apos;re judged on merit, not sorted by origin.
              </p>
              <p className={uniPillarAuditClass}>
                Together, fairness and verification do the same job from both ends: the system won&apos;t hold the
                wrong things against a student, and it gives landlords the right things to say yes to.
              </p>
            </div>
          </div>

          <h2 className={uniSectionTitleClass}>Why this matters to your office</h2>
          <div className={uniColsClass}>
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

          <h2 className={uniSectionTitleClass}>What a partnership can look like</h2>
          <div className={uniColsClass}>
            <ul>
              <li>A co-branded landing page or referral link for your accommodation and international pages</li>
              <li>Inclusion in pre-arrival and orientation accommodation information</li>
              <li>Short info sessions for incoming-student cohorts</li>
              <li>A direct contact for your team on student accommodation matters</li>
            </ul>
          </div>

          <div className={uniScopeClass}>
            <strong>An honest note on scope.</strong> Quni is a marketplace, so the final decision on a privately
            listed room rests with the individual landlord. What we guarantee is that our own tools never receive, and
            cannot use, a student&apos;s nationality, gender, domestic/international status, or date of birth, and that
            each decision leaves a tamper-evident record proving it. We don&apos;t claim to be &quot;bias-free&quot;
            everywhere, and we don&apos;t claim our AI can&apos;t be coaxed into clumsy wording. What we claim is the
            part that&apos;s enforced deterministically in code, and we keep the records to back it.
          </div>

          <PartnershipEnquiryForm />

          <p className={`${uniPrintOnlyClass} ${uniPrintContactClass}`}>{PRINT_CONTACT_COPY}</p>

          <div className={`${uniDocFooterClass} ${uniWebOnlyClass}`}>
            <div>
              <span className={uniTalkClass}>Let&apos;s talk.</span>
              <span className={uniContactClass}>
                {' '}
                <Link to="/contact">Contact us</Link>
                {' '}
                &nbsp;·&nbsp; quni.com.au
              </span>
            </div>
            <div className={uniTagClass}>student accommodation, matched on merit</div>
          </div>
        </article>
      </div>
    </>
  )
}
