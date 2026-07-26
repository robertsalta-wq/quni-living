import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import {
  Desk,
  DeskDrawer,
  DeskInTray,
  DeskLetterhead,
  DeskNameplate,
  DeskPaperweight,
  DeskPen,
  LedgerCalculator,
  PapersBlock,
} from '../components/desk'
import '../components/desk/desk.css'
import {
  FEE_ROWS_DRAWER,
  FEE_ROWS_VISIBLE,
  FOR_LANDLORDS_DESCRIPTION,
  FOR_LANDLORDS_PATH,
  LISTING_AI_DOES,
  RELATED_LANDLORD_LINKS,
  buildForLandlordsJsonLd,
} from '../lib/forLandlordsDeskContent'
import { SITE_CONTENT_MAX_CLASS, SITE_URL } from '../lib/site'

const settle = (delayMs: number): CSSProperties => ({ animationDelay: `${delayMs}ms` })

const drawerCtlPaper =
  'border-[var(--quni-cream-border)] bg-white/50 text-[var(--quni-ink-3)] hover:bg-white/80 group-hover:bg-white/80 focus-visible:outline-[var(--quni-coral)] [&_span:first-child]:text-[var(--quni-coral-active)]'

function FeeRows({ rows, paidId }: { rows: typeof FEE_ROWS_VISIBLE; paidId?: string }) {
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-baseline justify-between gap-2 border-b border-[var(--quni-ink)]/10 py-1.5 text-[10.5px] last:border-b-0"
        >
          <span className="font-semibold text-[var(--quni-ink-3)]">{row.label}</span>
          <span
            className={[
              'shrink-0 whitespace-nowrap text-[10px] font-extrabold',
              row.id === paidId
                ? 'text-[var(--quni-coral-active)]'
                : 'text-[var(--quni-success-strong)]',
            ].join(' ')}
          >
            {row.figure}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Live landlord front door — desk anatomy (shared slots from the /home-v2 system).
 * No marketing header/footer; wordmark + home return live in the grand Listing desk.
 */
export default function ForLandlords() {
  const [listingDrawerOpen, setListingDrawerOpen] = useState(false)
  const [feesDrawerOpen, setFeesDrawerOpen] = useState(false)
  const jsonLd = buildForLandlordsJsonLd(SITE_URL)

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[var(--quni-surface-2)] text-[var(--quni-ink-3)]">
      <Seo
        title="List a room — for landlords"
        description={FOR_LANDLORDS_DESCRIPTION}
        canonicalPath={FOR_LANDLORDS_PATH}
        jsonLd={jsonLd}
      />

      <main className={`${SITE_CONTENT_MAX_CLASS} flex flex-1 flex-col py-3 sm:py-4`}>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {/* 1 · LISTING — grand */}
          <Desk
            tone="navy"
            className="desk-settle gap-3 md:col-span-2"
            style={{
              ...settle(40),
              background: 'linear-gradient(168deg, #252236 0%, var(--quni-navy) 55%, #171422 100%)',
            }}
            nameplate={
              <div className="flex w-full items-center justify-between gap-3">
                <Link
                  to="/"
                  className="font-display text-[19px] font-bold text-white no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral-on-navy)]"
                  aria-label="Quni home"
                >
                  <span className="text-[var(--quni-coral)]">Q</span>uni
                  <small className="ml-1.5 align-middle font-sans text-[8px] font-extrabold tracking-[0.14em] text-white/45 uppercase">
                    ← home
                  </small>
                </Link>
                <DeskNameplate>Listing</DeskNameplate>
              </div>
            }
            letterhead={
              <DeskLetterhead className="mt-1 max-w-[400px] text-[22px] text-white sm:text-[26px]">
                Your listing writes itself. You just say{' '}
                <em className="not-italic text-[var(--quni-coral-on-navy)]">yes</em>.
              </DeskLetterhead>
            }
            inTray={
              <DeskInTray className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
                <div className="rounded-[11px] border border-white/10 bg-white/[0.05] px-3 py-2.5">
                  <p className="m-0 text-[8.5px] font-extrabold uppercase tracking-[0.14em] text-white/45">
                    AI draft · your room
                  </p>
                  <p className="mt-1.5 font-display text-[12.5px] leading-relaxed text-[var(--quni-cream)]">
                    Sunlit double in a quiet share house, 6 min walk to campus.
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[9px] font-bold text-white/70">
                      Market price suggested
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[9px] font-bold text-white/70">
                      Reply drafted <b className="text-[var(--quni-success)]">in seconds</b>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <DeskPen to="/signup?role=landlord" variant="coral" className="!w-auto self-start rounded-full px-5 py-2.5 text-[13px]">
                    List my room <span className="desk-pen-arw" aria-hidden>→</span>
                  </DeskPen>
                  <p className="m-0 font-display text-[10.5px] italic text-white/45">
                    The wax seal waits for the day you accept a tenant.
                  </p>
                  <DeskDrawer
                    label="What the AI does"
                    open={listingDrawerOpen}
                    onOpenChange={setListingDrawerOpen}
                  >
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                      {LISTING_AI_DOES.map((line) => (
                        <li
                          key={line}
                          className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[9px] font-bold text-white/70"
                        >
                          {line}
                        </li>
                      ))}
                    </ul>
                  </DeskDrawer>
                </div>
              </DeskInTray>
            }
          />

          {/* 2 · APPLICANTS */}
          <Desk
            tone="cream"
            className="desk-settle"
            style={{
              ...settle(160),
              background: 'linear-gradient(160deg, #F4FAF6 0%, #E6F2EB 100%)',
            }}
            nameplate={<DeskNameplate>Applicants</DeskNameplate>}
            letterhead={
              <DeskLetterhead className="text-[17px] text-[var(--quni-trust)]">
                A shortlist, not an inbox.
              </DeskLetterhead>
            }
            paperweight={<DeskPaperweight>✓ Verified</DeskPaperweight>}
            inTray={
              <DeskInTray>
                <div className="quni-card relative mt-1 border-[var(--quni-success)]/25 px-2.5 py-2">
                  <span className="absolute top-2 right-1.5 rotate-[-7deg] rounded-[3px] border border-[var(--quni-line)] px-1 py-0.5 text-[7px] font-black tracking-[0.14em] text-[var(--quni-ink-5)]">
                    SPECIMEN
                  </span>
                  <p className="m-0 font-display text-[13px] font-bold text-[var(--quni-ink)]">
                    A. Nguyen
                  </p>
                  <p className="m-0 mt-0.5 text-[9.5px] font-semibold text-[var(--quni-ink-4)]">
                    2nd year · moving 14 Feb · 12 months
                  </p>
                  <ul className="mt-2 flex list-none flex-col gap-1 p-0">
                    {['Identity verified', 'Enrolment verified'].map((t) => (
                      <li
                        key={t}
                        className="flex items-center gap-1.5 text-[9.5px] font-bold text-[var(--quni-trust)]"
                      >
                        <span
                          aria-hidden
                          className="inline-flex h-3 w-3 rotate-[-4deg] items-center justify-center rounded-[2.5px] border-[1.2px] border-[var(--quni-success)] bg-white text-[7.5px] font-black text-[var(--quni-success)]"
                        >
                          ✓
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 border-t border-dotted border-[var(--quni-line)] pt-1.5 font-display text-[9.5px] italic text-[var(--quni-trust)]">
                    Fit: dates match, budget matches, non-smoker.
                  </p>
                </div>
              </DeskInTray>
            }
            pen={
              <DeskPen to="/verification" variant="ink" className="!text-[var(--quni-success-strong)]">
                How verification works <span className="desk-pen-arw" aria-hidden>→</span>
              </DeskPen>
            }
          />

          {/* 3 · AGREEMENTS */}
          <Desk
            tone="cream"
            className="desk-settle"
            style={{
              ...settle(240),
              background: 'linear-gradient(160deg, #FFFDF6 0%, var(--quni-cream) 100%)',
            }}
            nameplate={<DeskNameplate>Agreements</DeskNameplate>}
            letterhead={
              <DeskLetterhead className="text-[17px] text-[var(--quni-ink-2)]">
                Accept — and the paperwork signs itself.
              </DeskLetterhead>
            }
            paperweight={<DeskPaperweight>✓ State-compliant</DeskPaperweight>}
            inTray={
              <DeskInTray>
                <div className="quni-card mt-1 border-[var(--quni-cream-border)] px-2.5 py-2.5">
                  <p className="m-0 font-display text-[11px] font-bold text-[var(--quni-ink-2)]">
                    Residential tenancy — room
                  </p>
                  <div className="mt-1.5 space-y-1.5">
                    <div className="h-[3px] w-[92%] rounded-sm bg-[var(--quni-cream-border)]" />
                    <div className="h-[3px] w-[78%] rounded-sm bg-[var(--quni-cream-border)]" />
                    <div className="h-[3px] w-[92%] rounded-sm bg-[var(--quni-cream-border)]" />
                    <div className="h-[3px] w-[64%] rounded-sm bg-[var(--quni-cream-border)]" />
                  </div>
                  <div className="mt-2.5 flex items-end justify-between gap-2">
                    <span className="border-b border-[var(--quni-cream-border)] px-0.5 pb-0.5 font-display text-[13px] italic text-[var(--quni-ink-3)]">
                      A. Nguyen
                    </span>
                    <span className="text-[7.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--quni-ink-5)]">
                      Signed online
                    </span>
                  </div>
                </div>
              </DeskInTray>
            }
            pen={
              <DeskPen
                to="/landlord-service-agreement"
                variant="ink"
                className="!text-[var(--quni-ink-3)]"
              >
                See a sample agreement <span className="desk-pen-arw" aria-hidden>→</span>
              </DeskPen>
            }
          />

          {/* 4 · FEES */}
          <Desk
            tone="cream"
            className="desk-settle"
            style={{
              ...settle(320),
              background: 'linear-gradient(160deg, #FFF3EE 0%, #FFE6DC 100%)',
            }}
            nameplate={<DeskNameplate>Fees</DeskNameplate>}
            letterhead={
              <DeskLetterhead className="text-[17px] text-[var(--quni-ink-2)]">
                Free to list.{' '}
                <em className="not-italic text-[var(--quni-coral-active)]">$99</em> once, only when
                you accept.
              </DeskLetterhead>
            }
            inTray={
              <DeskInTray className="mt-1">
                <FeeRows rows={FEE_ROWS_VISIBLE} paidId="accept" />
              </DeskInTray>
            }
            drawer={
              <DeskDrawer
                label="Every fee"
                open={feesDrawerOpen}
                onOpenChange={setFeesDrawerOpen}
                controlClassName={drawerCtlPaper}
              >
                <FeeRows rows={FEE_ROWS_DRAWER} />
              </DeskDrawer>
            }
          />

          {/* 5 · YOUR NUMBERS */}
          <Desk
            tone="cream"
            className="desk-settle"
            style={{
              ...settle(400),
              background: 'linear-gradient(160deg, #F6F1FF 0%, #ECE6FA 100%)',
            }}
            nameplate={<DeskNameplate>Your numbers</DeskNameplate>}
            letterhead={
              <DeskLetterhead className="text-[15px] text-[var(--quni-ink-2)]">
                One spare room, or the whole house.
              </DeskLetterhead>
            }
            inTray={
              <DeskInTray className="mt-1 max-w-md">
                <LedgerCalculator compact />
              </DeskInTray>
            }
          />

          {/* Related — quiet, below desks; does not compete with coral pen */}
          <nav
            aria-label="Related landlord pages"
            className="desk-settle md:col-span-3"
            style={settle(480)}
          >
            <p className="m-0 text-[8px] font-extrabold uppercase tracking-[0.15em] text-[var(--quni-ink-5)]">
              Related
            </p>
            <ul className="mt-1.5 flex list-none flex-wrap gap-x-3.5 gap-y-1 p-0">
              {RELATED_LANDLORD_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-[10.5px] font-semibold text-[var(--quni-ink-4)] no-underline [font-variant:small-caps] border-b border-dotted border-[var(--quni-cream-border)] hover:text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3" style={settle(500)}>
            <PapersBlock homeReturn />
          </div>
        </div>
      </main>
    </div>
  )
}
