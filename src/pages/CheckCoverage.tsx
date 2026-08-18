import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'

/**
 * /check - Host Exposure Check.
 *
 * A 60-second self-assessment that surfaces a host's real legal exposure
 * (unlodged bond, no written agreement, likely-void insurance) and routes
 * them to Quni to fix it. Doubles as an SEO landing page for bond/lease
 * search intent in NSW & QLD.
 *
 * Logic is grounded in Quni's verified NSW/QLD rule map. General information,
 * not legal advice - classification edge cases are flagged in the copy.
 */

type StateCode = 'NSW' | 'QLD'
type LiveIn = 'off' | 'on'
type BondStatus = 'held' | 'lodged' | 'none'
type AgreementStatus = 'yes' | 'no'
type Severity = 'red' | 'amber' | 'green'

type Answers = {
  state: StateCode | null
  live: LiveIn | null
  bond: BondStatus | null
  agreement: AgreementStatus | null
}

type Flag = { severity: Severity; title: string; detail: string }

const AUTHORITY: Record<StateCode, string> = {
  NSW: 'NSW Fair Trading (via Rental Bonds Online)',
  QLD: 'the RTA (Residential Tenancies Authority)',
}

function assess(a: Answers): Flag[] {
  const flags: Flag[] = []
  const offSite = a.live === 'off'
  const st = a.state as StateCode

  // --- Bond ---
  if (a.bond === 'held') {
    if (st === 'QLD') {
      flags.push({
        severity: 'red',
        title: 'Unlodged bond - this is a breach',
        detail:
          'In Queensland, if a bond is taken it must be lodged with the RTA within 10 days - even for live-in lodgers. Holding it in your own account is not allowed and penalties apply.',
      })
    } else if (offSite) {
      flags.push({
        severity: 'red',
        title: 'Unlodged bond - this is a breach',
        detail:
          'This is a standard tenancy, so the bond must be lodged with NSW Fair Trading (Rental Bonds Online). Holding it yourself is an offence under the Residential Tenancies Act 2010.',
      })
    } else {
      flags.push({
        severity: 'amber',
        title: 'Bond held by you - legal, but unprotected',
        detail:
          'As a live-in NSW lodger you are allowed to hold the bond. But it is not protected, disputes get messy, and there is no neutral record. Lodging it voluntarily is safer for everyone.',
      })
    }
  } else if (a.bond === 'none') {
    flags.push({
      severity: 'amber',
      title: 'No bond means no cushion',
      detail:
        'If a tenant damages a room or leaves owing rent, you have nothing to claim against and no simple path to recover the money.',
    })
  } else if (a.bond === 'lodged') {
    flags.push({
      severity: 'green',
      title: 'Bond lodged correctly',
      detail: 'Held by the authority, not you - protected and on the record. This is the right setup.',
    })
  }

  // --- Written agreement ---
  if (a.agreement === 'no') {
    if (offSite) {
      flags.push({
        severity: 'red',
        title: 'No written agreement - legally required',
        detail: `A tenancy where you do not live on-site must be in writing with the standard terms (${
          st === 'QLD' ? 'QLD General Tenancy Agreement, Form 18a' : 'the NSW standard form'
        }). Without it you cannot enforce any terms at ${st === 'QLD' ? 'QCAT' : 'NCAT'}.`,
      })
    } else {
      flags.push({
        severity: 'amber',
        title: 'No written agreement - high risk even for lodgers',
        detail:
          'The Act may not force one for a live-in arrangement, but on a handshake you have no agreed rent, notice, or house rules. In a dispute you have nothing to point to.',
      })
    }
    flags.push({
      severity: 'red',
      title: 'Your landlord insurance is likely void',
      detail:
        'Most landlord insurance policies require a signed written agreement. No lease usually means a denied claim - so you are carrying the entire risk yourself.',
    })
  } else if (a.agreement === 'yes') {
    flags.push({
      severity: 'green',
      title: 'Written agreement in place',
      detail: 'Enforceable terms and a valid basis for an insurance claim. Good.',
    })
  }

  return flags
}

function headline(flags: Flag[]): { title: string; sub: string } {
  if (flags.some((f) => f.severity === 'red')) {
    return {
      title: 'You are exposed right now',
      sub: 'One or more of these are not just untidy admin - they are breaches or gaps that cost you if anything goes wrong.',
    }
  }
  if (flags.some((f) => f.severity === 'amber')) {
    return { title: 'Mostly okay, with soft spots', sub: 'Nothing unlawful, but you are carrying avoidable risk. Worth tightening.' }
  }
  return { title: 'You are properly covered', sub: 'Bond lodged, agreement signed. This is exactly how it should look.' }
}

const DOT: Record<Severity, string> = {
  red: 'bg-red-600',
  amber: 'bg-amber-500',
  green: 'bg-emerald-600',
}

type Opt<T> = { value: T; label: string }

function QuestionRow<T extends string>({
  n,
  question,
  options,
  selected,
  onSelect,
}: {
  n: number
  question: string
  options: Opt<T>[]
  selected: T | null
  onSelect: (v: T) => void
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--quni-ink-4)]">
        {n} &middot; {question}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected === o.value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onSelect(o.value)}
              aria-pressed={active}
              className={[
                'rounded-xl border px-4 py-2.5 text-sm font-medium transition',
                active
                  ? 'border-[var(--quni-ink)] bg-[var(--quni-ink)] text-white'
                  : 'border-black/10 bg-white text-gray-800 hover:border-black/25',
              ].join(' ')}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function CheckCoverage() {
  const [answers, setAnswers] = useState<Answers>({ state: null, live: null, bond: null, agreement: null })

  const complete = answers.state !== null && answers.live !== null && answers.bond !== null && answers.agreement !== null
  const flags = useMemo(() => (complete ? assess(answers) : []), [complete, answers])
  const verdict = useMemo(() => (complete ? headline(flags) : null), [complete, flags])
  const actionable = flags.some((f) => f.severity === 'red' || f.severity === 'amber')

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Do I have to lodge a rental bond in Queensland?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'In Queensland, if a bond is taken it must be lodged with the RTA (Residential Tenancies Authority) within 10 days - even for boarders and lodgers. A landlord cannot legally hold the bond in their own account.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I have to lodge a rental bond in NSW?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'For a standard NSW residential tenancy the bond must be lodged with NSW Fair Trading via Rental Bonds Online. A live-in boarder or lodger arrangement sits outside the Residential Tenancies Act 2010, so the landlord may hold the bond - though voluntary lodgement is safer.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need a written tenancy agreement to rent out a room?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'For a tenancy where you do not live on-site, a written agreement with the standard terms is legally required. Without one you cannot enforce terms at a tribunal and most landlord insurance policies will not pay a claim.',
        },
      },
    ],
  }

  return (
    <>
      <Seo
        title="Are you actually covered? Host exposure check"
        description="A 60-second check for landlords and hosts renting out a room or property in NSW & QLD. See whether your bond is lodged, your agreement is compliant, and your insurance would actually pay out."
        canonicalPath="/check"
        jsonLd={faqJsonLd}
      />
      <div className="flex min-h-0 w-full flex-1 flex-col bg-[#FFF7E6] font-inter text-[var(--quni-ink)] antialiased">
        <PageHeroBand
          title="Are you actually covered?"
          subtitle="Most hosts don't find out they're exposed until something goes wrong. Answer three quick questions and see where you stand - before a tenant does."
        />

        <div className="max-w-site mx-auto w-full px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <div className="space-y-3">
              <QuestionRow
                n={1}
                question="Where's the property?"
                selected={answers.state}
                onSelect={(v: StateCode) => setAnswers((a) => ({ ...a, state: v }))}
                options={[
                  { value: 'NSW', label: 'New South Wales' },
                  { value: 'QLD', label: 'Queensland' },
                ]}
              />
              <QuestionRow
                n={2}
                question="Do you live in the property with the tenants?"
                selected={answers.live}
                onSelect={(v: LiveIn) => setAnswers((a) => ({ ...a, live: v }))}
                options={[
                  { value: 'off', label: "No - they've got the run of it" },
                  { value: 'on', label: "Yes - it's my home too" },
                ]}
              />
              <QuestionRow
                n={3}
                question="What's the bond situation?"
                selected={answers.bond}
                onSelect={(v: BondStatus) => setAnswers((a) => ({ ...a, bond: v }))}
                options={[
                  { value: 'held', label: 'I took a bond, holding it myself' },
                  { value: 'lodged', label: 'Bond lodged with the authority' },
                  { value: 'none', label: 'No bond taken' },
                ]}
              />
              <QuestionRow
                n={4}
                question="Is there a written agreement?"
                selected={answers.agreement}
                onSelect={(v: AgreementStatus) => setAnswers((a) => ({ ...a, agreement: v }))}
                options={[
                  { value: 'no', label: 'No written agreement' },
                  { value: 'yes', label: 'Signed written agreement' },
                ]}
              />
            </div>

            {complete && verdict && (
              <div className="mt-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-7">
                <div className="border-l-4 border-[var(--quni-coral)] pl-4">
                  <h2 className="font-display text-2xl font-bold text-gray-900">{verdict.title}</h2>
                  <p className="mt-1 text-sm text-gray-600">{verdict.sub}</p>
                </div>

                <ul className="mt-5 divide-y divide-black/5">
                  {flags.map((f, i) => (
                    <li key={`${f.severity}-${i}`} className="flex gap-3 py-4">
                      <span className={`mt-1.5 h-2.5 w-2.5 flex-none rounded-full ${DOT[f.severity]}`} aria-hidden />
                      <div>
                        <p className="font-semibold text-gray-900">{f.title}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-gray-700">{f.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {actionable && (
                  <div className="mt-5 rounded-xl border border-dashed border-black/15 bg-[#FFF7E6] p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--quni-ink-4)]">What fixes it</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-gray-800">
                      {answers.bond !== 'lodged' && (
                        <li>&rarr; Lodge the bond with {AUTHORITY[answers.state as StateCode]}.</li>
                      )}
                      {answers.agreement === 'no' && (
                        <li>
                          &rarr; Put a compliant written agreement in place
                          {answers.state === 'QLD' ? ' (Form 18a)' : ''} and get it signed.
                        </li>
                      )}
                      <li>&rarr; Keep a condition record so any damage claim actually sticks.</li>
                    </ul>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Link
                        to="/list-your-room"
                        className="rounded-xl bg-[var(--quni-coral)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                      >
                        Fix this with Quni &rarr;
                      </Link>
                      <span className="text-sm text-gray-600">Compliant agreement, bond sorted, in one pass.</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setAnswers({ state: null, live: null, bond: null, agreement: null })}
                  className="mt-4 text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700"
                >
                  Start over
                </button>
              </div>
            )}

            {/* Crawlable, always-rendered SEO content */}
            <div className="mt-12 border-t border-black/10 pt-8">
              <h2 className="font-display text-xl font-bold text-gray-900">The short version</h2>
              <div className="mt-4 space-y-5 text-sm leading-relaxed text-gray-700">
                <p>
                  <strong className="font-semibold text-gray-900">Queensland:</strong> if you take a bond, it must be
                  lodged with the RTA within 10 days - even for boarders and lodgers. You cannot hold it in your own
                  account.
                </p>
                <p>
                  <strong className="font-semibold text-gray-900">New South Wales:</strong> a standard tenancy bond must
                  be lodged with NSW Fair Trading via Rental Bonds Online. A genuine live-in lodger arrangement sits
                  outside the Residential Tenancies Act 2010, so you may hold the bond - but lodging it is safer.
                </p>
                <p>
                  <strong className="font-semibold text-gray-900">Written agreements:</strong> for any tenancy where you
                  don't live on-site, a written agreement with the standard terms is legally required. Without one you
                  can't enforce terms at a tribunal, and most landlord insurance won't pay out.
                </p>
                <p className="text-gray-500">
                  This is general information based on Quni's verified NSW &amp; QLD rule map, not legal advice.
                  Classification edge cases (lodger vs tenant, or a boarding house with five or more residents) should be
                  confirmed with the relevant authority. See{' '}
                  <Link to="/how-it-works" className="font-medium text-[var(--quni-coral)] hover:underline">
                    how Quni works
                  </Link>{' '}
                  for the full flow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
