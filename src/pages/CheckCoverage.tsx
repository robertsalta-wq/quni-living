import { useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import { buildFaqPageJsonLd } from '../lib/buildFaqPageJsonLd'

/**
 * `/check` - Host Exposure Check.
 *
 * Four questions, then a colour-coded verdict on bond handling, written
 * agreements, and landlord insurance for NSW and QLD hosts.
 *
 * SSR-safe: no window/document at module or render top level. The unanswered
 * form and the whole reference/FAQ body render server-side so the page is
 * crawlable without running the quiz.
 */

type StateCode = 'NSW' | 'QLD'
type Arrangement = 'live-in' | 'off-site'
type BondStatus = 'held' | 'lodged' | 'none'
type AgreementStatus = 'yes' | 'no'

type Level = 'red' | 'amber' | 'green'

type Finding = {
  id: string
  level: Level
  title: string
  detail: string
  /** Omitted when the finding is already green. */
  fix?: string
}

type Answers = {
  state: StateCode | null
  arrangement: Arrangement | null
  bond: BondStatus | null
  agreement: AgreementStatus | null
}

const EMPTY_ANSWERS: Answers = { state: null, arrangement: null, bond: null, agreement: null }

const SCHEME_NAME: Record<StateCode, string> = {
  NSW: 'NSW Fair Trading (Rental Bonds Online)',
  QLD: 'the Residential Tenancies Authority (RTA)',
}

/** Bond handling produces exactly one finding. */
function bondFinding(state: StateCode, arrangement: Arrangement, bond: BondStatus): Finding {
  if (bond === 'lodged') {
    return {
      id: 'bond',
      level: 'green',
      title: 'Bond is lodged with the scheme',
      detail: `Your bond sits with ${SCHEME_NAME[state]} rather than in your own account. That is the position the law expects, and it is the one that protects you in a dispute.`,
    }
  }

  if (bond === 'none') {
    return {
      id: 'bond',
      level: 'amber',
      title: 'No bond held',
      detail:
        'Taking no bond is lawful. It also means you carry the full cost of damage, unpaid rent, or an abandoned room yourself, with nothing to claim against.',
      fix: `If you decide to take a bond, lodge it with ${SCHEME_NAME[state]} rather than holding it. Never bank it yourself in the meantime.`,
    }
  }

  // bond === 'held'
  if (state === 'QLD') {
    return {
      id: 'bond',
      level: 'red',
      title: 'You are holding a bond that must be lodged',
      detail:
        'In Queensland a bond, once taken, must be lodged with the Residential Tenancies Authority within 10 days. That applies to rooming accommodation as well as to standard tenancies, so a live-in arrangement does not exempt you. Holding it yourself is a breach.',
      fix: 'Lodge the bond with the RTA now using a Bond lodgement (Form 2). Lodging late is a far better position than not lodging at all.',
    }
  }

  if (arrangement === 'off-site') {
    return {
      id: 'bond',
      level: 'red',
      title: 'You are holding a bond that must be lodged',
      detail:
        'You do not live at the property, so this is a residential tenancy under the Residential Tenancies Act 2010 (NSW). Bond money must be lodged with NSW Fair Trading. Holding it in your own account is an offence, not just bad practice.',
      fix: 'Lodge the bond through Rental Bonds Online with NSW Fair Trading now.',
    }
  }

  return {
    id: 'bond',
    level: 'amber',
    title: 'Bond held directly, and unprotected',
    detail:
      'As a live-in host in NSW your boarder or lodger generally sits outside the Residential Tenancies Act 2010, so holding the money yourself is not unlawful. It is also unprotected: there is no scheme record, no neutral holder, and no clean way to prove what was agreed if the money is disputed.',
    fix: 'Hold it in a separate account, never mixed with your own money, and put the amount, the reason it can be claimed, and the return timeline in writing before the money changes hands.',
  }
}

/** A missing written agreement produces two independent findings: legal standing and insurance. */
function agreementFindings(
  state: StateCode,
  arrangement: Arrangement,
  agreement: AgreementStatus,
): Finding[] {
  if (agreement === 'yes') {
    return [
      {
        id: 'agreement',
        level: 'green',
        title: 'Written agreement in place',
        detail:
          'A signed written agreement is what gives you something to enforce, and it is what an insurer looks for first. This is the single highest-value thing a host can have.',
      },
    ]
  }

  const tribunal = state === 'NSW' ? 'NCAT' : 'QCAT'
  const form =
    state === 'NSW'
      ? 'the NSW standard form residential tenancy agreement'
      : 'the QLD General tenancy agreement (Form 18a)'

  const legal: Finding =
    arrangement === 'off-site'
      ? {
          id: 'agreement-legal',
          level: 'red',
          title: 'No written agreement, and one is legally required',
          detail: `You do not live at the property, so this is a residential tenancy and a written agreement is required, using ${form}. Without one you have very little to run on at ${tribunal} if you need to recover rent, claim for damage, or end the tenancy.`,
          fix: `Put ${form} in place and have both parties sign it before anything else. Do this even if the person has already moved in.`,
        }
      : {
          id: 'agreement-legal',
          level: 'amber',
          title: 'No written agreement for a live-in arrangement',
          detail:
            'A live-in boarder or lodger arrangement does not have to use the prescribed tenancy form, so nothing here is unlawful on its own. But an unwritten arrangement means the terms are whatever each of you remembers, and that is where disputes start.',
          fix: 'Use a written occupancy or boarding agreement covering rent, notice, house rules, and what happens to any money you hold.',
        }

  const insurance: Finding = {
    id: 'agreement-insurance',
    level: 'red',
    title: 'Your landlord insurance is probably void',
    detail:
      'Most landlord insurance policies in Australia require a signed written agreement with the occupant as a condition of cover. Without one, a claim for damage, loss of rent, or liability is likely to be declined, whether you live at the property or not.',
    fix: 'Get the agreement signed, then check your policy wording or ask your insurer directly whether your current arrangement is covered.',
  }

  return [legal, insurance]
}

function buildFindings(answers: Answers): Finding[] | null {
  const { state, arrangement, bond, agreement } = answers
  if (!state || !arrangement || !bond || !agreement) return null
  return [
    bondFinding(state, arrangement, bond),
    ...agreementFindings(state, arrangement, agreement),
  ]
}

function overallLevel(findings: Finding[]): Level {
  if (findings.some((f) => f.level === 'red')) return 'red'
  if (findings.some((f) => f.level === 'amber')) return 'amber'
  return 'green'
}

const VERDICT_COPY: Record<Level, { heading: string; blurb: string }> = {
  red: {
    heading: 'You are exposed right now',
    blurb:
      'At least one part of your setup is a breach or leaves you with no cover. These are worth fixing this week, not this quarter.',
  },
  amber: {
    heading: 'Mostly okay, with soft spots',
    blurb:
      'Nothing here is unlawful, but parts of your setup rely on goodwill rather than on anything you could enforce or claim on.',
  },
  green: {
    heading: 'You are properly covered',
    blurb:
      'Bond and agreement are both in the position the law expects. Keep the paperwork where you can find it and review it at each new occupant.',
  },
}

const LEVEL_LABEL: Record<Level, string> = { red: 'Exposed', amber: 'Soft spot', green: 'Covered' }

const LEVEL_CARD: Record<Level, string> = {
  red: 'border-[rgba(180,50,42,0.3)] bg-[var(--quni-danger-bg)]',
  amber: 'border-[rgba(183,121,31,0.35)] bg-[var(--quni-warning-bg)]',
  green: 'border-[rgba(55,98,86,0.3)] bg-[var(--quni-trust-bg)]',
}

const LEVEL_CHIP: Record<Level, string> = {
  red: 'bg-[var(--quni-danger-strong)] text-white',
  amber: 'bg-[var(--quni-warning-fg)] text-white',
  green: 'bg-[var(--quni-trust)] text-white',
}

const LEVEL_TEXT: Record<Level, string> = {
  red: 'text-[var(--quni-danger-fg)]',
  amber: 'text-[var(--quni-warning-fg)]',
  green: 'text-[var(--quni-trust)]',
}

type QuestionDef<K extends keyof Answers> = {
  key: K
  legend: string
  help?: string
  options: { value: NonNullable<Answers[K]>; label: string; hint?: string }[]
}

const STATE_QUESTION: QuestionDef<'state'> = {
  key: 'state',
  legend: '1. Which state is the room in?',
  options: [
    { value: 'NSW', label: 'New South Wales' },
    { value: 'QLD', label: 'Queensland' },
  ],
}

const ARRANGEMENT_QUESTION: QuestionDef<'arrangement'> = {
  key: 'arrangement',
  legend: '2. Do you live at the property?',
  help: 'This is the question that decides which law applies to you.',
  options: [
    {
      value: 'live-in',
      label: 'Yes, I live there too',
      hint: 'Your occupant is usually a boarder or lodger.',
    },
    {
      value: 'off-site',
      label: 'No, I live elsewhere',
      hint: 'This is usually a residential tenancy.',
    },
  ],
}

const BOND_QUESTION: QuestionDef<'bond'> = {
  key: 'bond',
  legend: '3. Where is the bond?',
  options: [
    { value: 'held', label: 'I am holding it', hint: 'In your own bank account or as cash.' },
    { value: 'lodged', label: 'Lodged with the scheme', hint: 'Rental Bonds Online, or the RTA.' },
    { value: 'none', label: 'I did not take a bond' },
  ],
}

const AGREEMENT_QUESTION: QuestionDef<'agreement'> = {
  key: 'agreement',
  legend: '4. Is there a signed written agreement?',
  options: [
    { value: 'yes', label: 'Yes, signed by both of us' },
    { value: 'no', label: 'No, or only a verbal arrangement' },
  ],
}

const FAQS = [
  {
    question: 'Do I have to lodge a bond if my lodger lives with me?',
    answer:
      'It depends on the state. In Queensland a bond must be lodged with the Residential Tenancies Authority within 10 days once it is taken, and that covers rooming accommodation as well as standard tenancies, so a live-in arrangement does not exempt you. In New South Wales a live-in boarder or lodger generally sits outside the Residential Tenancies Act 2010, so holding the bond yourself is not unlawful, but it is also unprotected. If you do not live at the property in NSW, the bond must be lodged with NSW Fair Trading.',
  },
  {
    question: 'What happens if I keep a bond in my own account when it should be lodged?',
    answer:
      'Failing to lodge bond money that is required to be lodged is an offence, not just poor practice. In NSW it is an offence under the Residential Tenancies Act 2010, and in Queensland it is a breach of the lodgement requirement. Lodging late puts you in a much better position than not lodging at all, so if you are holding a bond you should lodge it now rather than wait.',
  },
  {
    question: 'Do I legally need a written agreement to rent out a room?',
    answer:
      'If you do not live at the property, yes. That is a residential tenancy and a written agreement is required, using the NSW standard form residential tenancy agreement or the Queensland General tenancy agreement (Form 18a). Without one you have very little to run on at NCAT or QCAT. If you live at the property, a written agreement is not required in the same prescribed form, but going without one leaves the terms to memory.',
  },
  {
    question: 'Does a missing written agreement affect my landlord insurance?',
    answer:
      'Usually yes. Most landlord insurance policies in Australia require a signed written agreement with the occupant as a condition of cover, so a claim for damage, loss of rent, or liability is likely to be declined without one. This applies whether or not you live at the property, which is why a missing agreement is a serious gap even for live-in hosts.',
  },
  {
    question: 'How do I know whether my occupant is a lodger or a tenant?',
    answer:
      'The usual dividing line is whether the owner lives at the property and how much exclusive control the occupant has over their own space. It is not always clear cut, and the classification changes which rules apply to bond and agreements. Some arrangements with five or more residents are treated as boarding houses or rooming accommodation with their own separate rules. If your situation sits near a line, confirm it with NSW Fair Trading or the Queensland Residential Tenancies Authority before relying on either answer.',
  },
]

function RadioRow<K extends keyof Answers>({
  question,
  value,
  onSelect,
}: {
  question: QuestionDef<K>
  value: Answers[K]
  onSelect: (v: NonNullable<Answers[K]>) => void
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="font-display text-lg font-bold text-[var(--quni-ink)]">
        {question.legend}
      </legend>
      {question.help ? (
        <p className="mt-1 text-sm text-[var(--quni-ink-4)]">{question.help}</p>
      ) : null}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {question.options.map((opt) => {
          const selected = value === opt.value
          return (
            <label
              key={String(opt.value)}
              className={`flex cursor-pointer flex-col rounded-xl border px-4 py-3 text-left transition ${
                selected
                  ? 'border-[var(--quni-coral)] bg-[var(--quni-coral-tint)] shadow-sm'
                  : 'border-[var(--quni-line)] bg-white hover:border-[var(--quni-coral-border)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={String(question.key)}
                  value={String(opt.value)}
                  checked={selected}
                  onChange={() => onSelect(opt.value)}
                  className="h-4 w-4 accent-[var(--quni-coral)]"
                />
                <span className="text-sm font-semibold text-[var(--quni-ink-2)]">{opt.label}</span>
              </span>
              {opt.hint ? (
                <span className="mt-1 pl-6 text-xs text-[var(--quni-ink-4)]">{opt.hint}</span>
              ) : null}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function CheckCoverage() {
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS)

  const findings = buildFindings(answers)
  const verdict = findings ? overallLevel(findings) : null
  const answeredCount = Object.values(answers).filter((v) => v !== null).length

  function set<K extends keyof Answers>(key: K, value: NonNullable<Answers[K]>) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <>
      <Seo
        title="Host exposure check - is your room rental actually covered?"
        description="A 60 second check for NSW and QLD hosts. Answer four questions about your bond, your agreement, and whether you live at the property, and see where you are exposed."
        canonicalPath="/check"
        jsonLd={buildFaqPageJsonLd(FAQS) ?? undefined}
      />
      <div className="flex min-h-0 w-full flex-1 flex-col bg-[var(--quni-cream)] font-inter text-[var(--quni-ink)] antialiased">
        <PageHeroBand
          title="Host exposure check"
          subtitle="Four questions, about 60 seconds. See whether your bond, your agreement, and your insurance actually hold up in NSW or QLD."
        />

        <div className="max-w-site mx-auto w-full px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm leading-relaxed text-[var(--quni-ink-4)] sm:text-base">
              Most hosts renting out a room get one of three things wrong: they hold a bond that should have
              been lodged, they run on a verbal arrangement, or they assume their insurance covers them when
              the policy says otherwise. This check tells you which of those applies to you, and what fixes it.
            </p>

            <section aria-labelledby="check-form-heading" className="mt-10">
              <h2 id="check-form-heading" className="sr-only">
                Your situation
              </h2>
              <div className="space-y-8 rounded-2xl bg-white p-6 shadow-md sm:p-8">
                <RadioRow
                  question={STATE_QUESTION}
                  value={answers.state}
                  onSelect={(v) => set('state', v)}
                />
                <RadioRow
                  question={ARRANGEMENT_QUESTION}
                  value={answers.arrangement}
                  onSelect={(v) => set('arrangement', v)}
                />
                <RadioRow
                  question={BOND_QUESTION}
                  value={answers.bond}
                  onSelect={(v) => set('bond', v)}
                />
                <RadioRow
                  question={AGREEMENT_QUESTION}
                  value={answers.agreement}
                  onSelect={(v) => set('agreement', v)}
                />
              </div>
            </section>

            <section aria-labelledby="check-result-heading" aria-live="polite" className="mt-10">
              <h2 id="check-result-heading" className="sr-only">
                Your result
              </h2>
              {findings && verdict ? (
                <>
                  <div className={`rounded-2xl border p-6 shadow-sm sm:p-8 ${LEVEL_CARD[verdict]}`}>
                    <p className={`font-display text-2xl font-bold sm:text-3xl ${LEVEL_TEXT[verdict]}`}>
                      {VERDICT_COPY[verdict].heading}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--quni-ink-3)] sm:text-base">
                      {VERDICT_COPY[verdict].blurb}
                    </p>
                  </div>

                  <ul className="mt-6 space-y-4">
                    {findings.map((f) => (
                      <li key={f.id} className={`rounded-2xl border p-5 sm:p-6 ${LEVEL_CARD[f.level]}`}>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${LEVEL_CHIP[f.level]}`}
                        >
                          {LEVEL_LABEL[f.level]}
                        </span>
                        <h3 className="font-display mt-3 text-lg font-bold text-[var(--quni-ink)]">
                          {f.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--quni-ink-3)]">{f.detail}</p>
                        {f.fix ? (
                          <p className="mt-3 text-sm leading-relaxed text-[var(--quni-ink-3)]">
                            <strong className="font-semibold text-[var(--quni-ink)]">What fixes it: </strong>
                            {f.fix}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 rounded-2xl bg-[var(--quni-coral-soft)] p-6 text-center sm:p-8">
                    <p className="font-display text-xl font-bold text-[var(--quni-ink)]">
                      List the room with the paperwork built in
                    </p>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[var(--quni-ink-4)]">
                      Quni gives you the right agreement for your state and keeps bond handling on the correct
                      path, so the gaps above do not come back at the next occupant.
                    </p>
                    <Link
                      to="/list-your-room"
                      className="mt-5 inline-flex items-center justify-center rounded-xl bg-[var(--quni-coral)] px-6 py-3 text-sm font-semibold text-white hover:opacity-95"
                    >
                      List your room
                    </Link>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--quni-line)] bg-white/60 p-6 text-center">
                  <p className="text-sm text-[var(--quni-ink-4)]">
                    Answer all four questions to see your result. {answeredCount} of 4 answered.
                  </p>
                </div>
              )}
            </section>

            <section aria-labelledby="check-rules-heading" className="mt-14">
              <h2
                id="check-rules-heading"
                className="font-display text-2xl font-bold text-[var(--quni-trust)] sm:text-3xl"
              >
                How the rules actually work
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--quni-ink-4)]">
                The single fact that changes everything is whether you live at the property. It decides whether
                your occupant is a tenant or a lodger, and that decides what you must do with the bond and the
                agreement.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <h3 className="font-display text-xl font-bold text-[var(--quni-trust)]">New South Wales</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--quni-ink-3)]">
                    <li>
                      <strong className="font-semibold text-[var(--quni-ink)]">If you live elsewhere:</strong>{' '}
                      this is a residential tenancy under the Residential Tenancies Act 2010. Bond must be
                      lodged with NSW Fair Trading through Rental Bonds Online, and holding it yourself is an
                      offence. A written agreement on the NSW standard form is required.
                    </li>
                    <li>
                      <strong className="font-semibold text-[var(--quni-ink)]">If you live there too:</strong>{' '}
                      your occupant is generally a boarder or lodger and sits outside that Act. You may hold a
                      bond lawfully, but nothing protects either side if it is disputed, and a written
                      agreement is still what your insurer will ask for.
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <h3 className="font-display text-xl font-bold text-[var(--quni-trust)]">Queensland</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--quni-ink-3)]">
                    <li>
                      <strong className="font-semibold text-[var(--quni-ink)]">Bond, either way:</strong> once
                      a bond is taken it must be lodged with the Residential Tenancies Authority within 10
                      days. That requirement reaches rooming accommodation as well as standard tenancies, so
                      living at the property does not exempt you. Landlord-held bond is a breach.
                    </li>
                    <li>
                      <strong className="font-semibold text-[var(--quni-ink)]">Agreement:</strong> if you live
                      elsewhere, a written General tenancy agreement (Form 18a) is required, and without it you
                      have little to run on at QCAT. If you live there, use a written rooming or boarding
                      agreement anyway.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="font-display text-xl font-bold text-[var(--quni-trust)]">
                  Insurance, in both states
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--quni-ink-3)]">
                  Most landlord insurance policies require a signed written agreement with the occupant as a
                  condition of cover. This is the part hosts miss most often, because it does not depend on
                  whether you live at the property. A verbal arrangement can leave a damage or loss-of-rent
                  claim declined even where the arrangement itself was perfectly lawful.
                </p>
              </div>
            </section>

            <section aria-labelledby="check-faq-heading" className="mt-14">
              <h2
                id="check-faq-heading"
                className="font-display text-2xl font-bold text-[var(--quni-trust)] sm:text-3xl"
              >
                Common questions
              </h2>
              <dl className="mt-6 space-y-5">
                {FAQS.map((f) => (
                  <div key={f.question} className="rounded-2xl bg-white p-6 shadow-sm">
                    <dt className="font-display text-lg font-bold text-[var(--quni-ink)]">{f.question}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-[var(--quni-ink-3)]">{f.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-labelledby="check-disclaimer-heading" className="mt-12">
              <h2 id="check-disclaimer-heading" className="sr-only">
                Important
              </h2>
              <div className="rounded-2xl border border-[var(--quni-line)] bg-white/60 p-6">
                <p className="text-xs leading-relaxed text-[var(--quni-ink-4)]">
                  This check is general information, not legal advice. It does not take account of your
                  particular circumstances. Classification can be genuinely unclear at the edges: whether an
                  occupant is a lodger or a tenant turns on the facts of the arrangement, and a property with
                  five or more residents may be treated as a boarding house or rooming accommodation with its
                  own separate rules. Confirm your situation with NSW Fair Trading or the Queensland
                  Residential Tenancies Authority, or get your own legal advice, before relying on any answer
                  here.
                </p>
              </div>
            </section>

            <div className="mt-12 flex flex-col gap-3 text-center sm:flex-row sm:justify-center">
              <Link
                to="/how-it-works"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--quni-rust)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--quni-rust)] hover:bg-[rgba(216,90,48,0.06)]"
              >
                How Quni works
              </Link>
              <Link
                to="/list-your-room"
                className="inline-flex items-center justify-center rounded-xl bg-[var(--quni-coral)] px-6 py-3 text-sm font-semibold text-white hover:opacity-95"
              >
                List your room
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
