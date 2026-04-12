import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { adminTableWrapClass } from './adminUi'

const CORAL = '#FF6F61'
const TRUST_KEY = 'trust_checklist'
const TOTAL_TASKS = 52

const LISTING_LIVE_TASK_IDS = new Set([11, 22])
const LANDLORD_CONTACT_TASK_IDS = new Set([13, 14, 15, 16])

type PhaseTone = 'coral' | 'amber' | 'green' | 'purple' | 'blue' | 'gray'

type PhaseDef = {
  tone: PhaseTone
  badgeLabel: string
  title: string
  subtitle: string
  taskIds: number[]
  /** When set, panel renders FAQ-style group labels + divider between groups. */
  taskGroups?: { label: string; taskIds: number[] }[]
}

/** Roadmap / delivery status for checklist items that track build state explicitly. */
type TrustChecklistItemStatus = 'complete' | 'in-progress' | 'planned' | 'not-started'

type TaskDef = {
  id: number
  label: string
  description: string
  category?: string
  status?: TrustChecklistItemStatus
}

const PHASES: PhaseDef[] = [
  {
    tone: 'coral',
    badgeLabel: 'Phase 1',
    title: 'Before go-live — non-negotiables',
    subtitle: 'Blockers to clear before you take real money or public traffic.',
    taskIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    tone: 'amber',
    badgeLabel: 'Phase 2',
    title: 'Pre-launch compliance — legal and bond readiness',
    subtitle: 'Resolve regulatory and payment-flow risk before real volume.',
    taskIds: [48, 49, 50, 51],
    taskGroups: [
      {
        label: 'Priority — resolve before first real booking',
        taskIds: [48, 49, 50],
      },
      {
        label: 'Lower priority — resolve before scale',
        taskIds: [51],
      },
    ],
  },
  {
    tone: 'green',
    badgeLabel: 'Phase 3',
    title: 'Seed 5–10 real listings',
    subtitle: 'Outreach and onboarding to prove the marketplace.',
    taskIds: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
  },
  {
    tone: 'purple',
    badgeLabel: 'Phase 4',
    title: 'Week 1–2 after launch',
    subtitle: 'Trust signals, SEO basics, and polish.',
    taskIds: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33],
  },
  {
    tone: 'blue',
    badgeLabel: 'Phase 5',
    title: 'Month 1–2 credibility multipliers',
    subtitle: 'Universities, press, reviews, and proof.',
    taskIds: [34, 35, 36, 37, 38, 39, 40, 41, 42],
  },
  {
    tone: 'gray',
    badgeLabel: 'Phase 6',
    title: 'Ongoing',
    subtitle: 'Habits that compound trust and distribution.',
    taskIds: [43, 44, 45, 46, 47],
  },
  {
    tone: 'gray',
    badgeLabel: 'Phase 7',
    title: 'Communications — inbox and messaging',
    subtitle: 'Channels and admin tooling for enquiries and replies.',
    taskIds: [52],
  },
]

const TASKS_BY_ID: Record<number, TaskDef> = {
  1: {
    id: 1,
    label: 'DNS cutover — quni.com.au live',
    description:
      'Switch from quni-living.vercel.app to quni.com.au. Submit updated sitemap to Google Search Console immediately after.',
  },
  2: {
    id: 2,
    label: 'Switch Stripe from test mode to live',
    description: 'No real payments can be taken until this is done. Confirm with a real card transaction before opening to the public.',
  },
  3: {
    id: 3,
    label: 'ABN and legal entity name in footer',
    description: 'Format: © 2025 Quni Living Pty Ltd · ABN XX XXX XXX XXX · Sydney, NSW.',
  },
  4: {
    id: 4,
    label: 'Privacy Policy published',
    description: 'Must reference the Australian Privacy Act 1988. Linked from the footer.',
  },
  5: {
    id: 5,
    label: 'Terms of Service published',
    description: 'Must reference Australian Consumer Law and NSW tenancy law. Have it reviewed by a solicitor.',
  },
  6: {
    id: 6,
    label: 'Refund and dispute policy published',
    description: 'Must be visible before any booking can be placed.',
  },
  7: {
    id: 7,
    label: 'Verified Landlord badge on listing cards and profiles',
    description: 'Cursor task: deploy badge component to all listing cards and landlord profiles.',
  },
  8: {
    id: 8,
    label: 'Student Verified badge on student profiles',
    description: 'Cursor task: deploy badge to student profiles visible to landlords in the booking dashboard.',
  },
  9: {
    id: 9,
    label: 'Stripe branding on booking and payment pages',
    description: 'Cursor task: add "Payments secured by Stripe" callout with Stripe logo to the booking flow.',
  },
  10: {
    id: 10,
    label: 'Lease signing explainer near DocuSeal step',
    description:
      'Cursor task: add callout — "Legally binding NSW-compliant tenancy agreement, signed in-platform."',
  },
  11: {
    id: 11,
    label: 'List Casa Malvina on Quni — listing #1',
    description: 'Your own property. Zero outreach needed. Gets the platform to one real verified listing immediately.',
  },
  12: {
    id: 12,
    label: 'Test the full booking flow end-to-end',
    description:
      'Sign up as a student, find a listing, enquire, book, sign a lease, process a payment. Fix anything that breaks.',
  },
  13: {
    id: 13,
    label: 'Search Flatmates.com.au near USYD (Newtown, Glebe, Camperdown)',
    description: 'Note landlord contacts for all private listings — not via agent.',
  },
  14: {
    id: 14,
    label: 'Search Flatmates.com.au near UNSW (Kensington, Randwick, Maroubra)',
    description: 'Private listings only. Build a contact list.',
  },
  15: {
    id: 15,
    label: 'Search Flatmates.com.au near Macquarie (Macquarie Park, Ryde, Meadowbank)',
    description: 'Add to contact list. Target 20+ landlord contacts before starting outreach.',
  },
  16: {
    id: 16,
    label: 'Search Gumtree and Domain near UTS and remaining campuses',
    description: 'Haymarket, Ultimo, Pyrmont for UTS. Private listings only.',
  },
  17: {
    id: 17,
    label: 'Write a short outreach message template',
    description: '3 sentences: who you are, what Quni does, the offer. Personalise the suburb in each message.',
  },
  18: {
    id: 18,
    label: 'Send personalised outreach to your shortlist',
    description: 'Do not bulk send. Individual messages convert far better.',
  },
  19: {
    id: 19,
    label: 'Follow up once after 3 days if no reply',
    description: 'One follow-up only. Short and friendly.',
  },
  20: {
    id: 20,
    label: 'Post in Sydney landlord Facebook groups',
    description: 'Search: "Sydney landlords", "Sydney property investors". Post as a genuine announcement.',
  },
  21: {
    id: 21,
    label: 'Walk each new landlord through onboarding personally',
    description: 'Do it on a call or screenshare for the first 5 landlords.',
  },
  22: {
    id: 22,
    label: 'Confirm each listing has Verified Landlord badge, real photos, and accurate dates',
    description: 'Check every live listing card before calling it done.',
  },
  23: {
    id: 23,
    label: 'Confirm at least 2 results show for each target suburb search',
    description: 'One result looks like a test. Two or more looks like a working marketplace.',
  },
  24: {
    id: 24,
    label: 'How it works section on homepage',
    description: 'Cursor task: 3 steps for students, 3 for landlords. Simple, visual, above the fold.',
  },
  25: {
    id: 25,
    label: 'FAQ section addressing top visitor anxieties',
    description: 'Cursor task: accordion component answering the top 4–5 visitor concerns.',
  },
  26: {
    id: 26,
    label: 'Founder About page',
    description: 'Cursor task: page with name, photo, and a short origin story.',
  },
  27: {
    id: 27,
    label: 'Collect first 2–3 testimonials from beta users',
    description: 'Ask directly. One sentence is enough. Add to homepage.',
  },
  28: {
    id: 28,
    label: 'Ask first landlords for a testimonial',
    description: '"Easy to set up, first enquiry within 48 hours" is enough.',
  },
  29: {
    id: 29,
    label: 'Create and verify Google Business Profile',
    description: 'Use your Sydney/Ryde address.',
  },
  30: {
    id: 30,
    label: 'Mobile performance audit — Lighthouse score 85+',
    description: 'Run Lighthouse in Chrome DevTools and fix anything flagged below 85 on mobile.',
  },
  31: {
    id: 31,
    label: 'Check site on iPhone and Android',
    description: 'Test both iOS Safari and Android Chrome.',
  },
  32: {
    id: 32,
    label: 'Submit sitemap and request indexing in Google Search Console',
    description: 'After DNS cutover. Check Core Web Vitals report.',
  },
  33: {
    id: 33,
    label: 'Resend DNS verification completed for hello@quni.com.au',
    description: 'Transactional emails from a verified custom domain look legitimate.',
  },
  34: {
    id: 34,
    label: 'Contact UNSW Arc student union — housing resources',
    description: 'Ask to be listed on their off-campus housing resources page.',
  },
  35: {
    id: 35,
    label: 'Contact USyd SRC student union — housing resources',
    description: 'Frame it as a free resource for students.',
  },
  36: {
    id: 36,
    label: 'Contact UTS Activate and Macquarie student associations',
    description: 'Broaden the university union outreach.',
  },
  37: {
    id: 37,
    label: 'Email international student offices at USYD, UNSW, Macquarie',
    description: 'They constantly field housing questions — Quni is a natural referral.',
  },
  38: {
    id: 38,
    label: 'Pitch Honi Soit (USyd student newspaper)',
    description: 'Founder story angle: "I built this because finding student housing in Sydney is broken."',
  },
  39: {
    id: 39,
    label: 'Pitch Tharunka (UNSW) and Vertigo (UTS)',
    description: 'Same angle. Even a brief mention gives you a screenshot for the homepage.',
  },
  40: {
    id: 40,
    label: 'Collect first Google reviews',
    description: 'Ask your first 5–10 users directly.',
  },
  41: {
    id: 41,
    label: 'Publish one case study with real name and specifics',
    description: 'One real story beats any testimonial.',
  },
  42: {
    id: 42,
    label: 'Add as seen in or university logos section to homepage',
    description: 'Cursor task: once you have one university or media mention, add a logo row to the homepage.',
  },
  43: {
    id: 43,
    label: 'Ask every successful user for a testimonial or Google review',
    description: 'Build it into the post-booking email flow.',
  },
  44: {
    id: 44,
    label: 'Monitor listing view to enquiry ratio monthly',
    description: 'A rising ratio means trust is working.',
  },
  45: {
    id: 45,
    label: 'Produce Sydney Student Accommodation Cost Report 2026',
    description: 'A one-pager based on Supabase listing data. Shareable asset for PR and backlinks.',
  },
  46: {
    id: 46,
    label: 'Expand university union outreach to Melbourne, Brisbane, Perth',
    description: 'Replicate the Sydney approach in each new city before running paid acquisition there.',
  },
  47: {
    id: 47,
    label: 'Keep Privacy Policy and Terms of Service current',
    description: 'Review at least annually or when the fee structure changes.',
  },
  48: {
    id: 48,
    label: 'Rooming house registration check',
    description:
      'Determine whether landlords listing multiple rooms on Quni are operating rooming houses under the Boarding Houses Act 2012 and whether registration with local council is required. Seek advice from NSW Fair Trading (13 32 20) or a property lawyer. This may affect the agreement type used and landlord onboarding requirements.',
  },
  49: {
    id: 49,
    label: 'Bond lodgement process',
    description:
      'Confirm whether student self-lodgement via Rental Bond Online is compliant for Quni\'s model. Build instruction email triggered post-signing and bond reference number field in the tenant and landlord dashboard.',
  },
  50: {
    id: 50,
    label: 'RBO API enquiry',
    description:
      'Email rbosupport@customerservice.nsw.gov.au to ask whether a machine-to-machine integration exists for proptech platforms.',
  },
  51: {
    id: 51,
    label: 'Stripe bond collection compliance',
    description:
      'If bond is ever collected via Stripe, ensure transfer to Fair Trading within 10 working days and add tenant opt-out pathway to RBO direct payment.',
  },
  52: {
    id: 52,
    category: 'Communications',
    label: 'Gmail inbox integration',
    description: 'Connect Gmail API to view and reply to enquiries directly from the admin dashboard',
    status: 'planned',
  },
}

function parseCompletedItems(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const out: number[] = []
  for (const x of raw) {
    if (typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= TOTAL_TASKS) out.push(x)
  }
  return [...new Set(out)].sort((a, b) => a - b)
}

function toneBadgeClass(tone: PhaseTone): string {
  switch (tone) {
    case 'coral':
      return 'border-[#FF6F61] bg-[#FF6F61]/10 text-gray-900'
    case 'amber':
      return 'border-amber-500 bg-amber-50 text-amber-950'
    case 'green':
      return 'border-emerald-400 bg-emerald-50 text-emerald-900'
    case 'purple':
      return 'border-violet-400 bg-violet-50 text-violet-900'
    case 'blue':
      return 'border-sky-400 bg-sky-50 text-sky-900'
    case 'gray':
      return 'border-gray-300 bg-gray-100 text-gray-800'
    default:
      return 'border-gray-300 bg-gray-100 text-gray-800'
  }
}

function phaseAccentBar(tone: PhaseTone): string {
  switch (tone) {
    case 'coral':
      return 'bg-[#FF6F61]'
    case 'amber':
      return 'bg-amber-500'
    case 'green':
      return 'bg-emerald-500'
    case 'purple':
      return 'bg-violet-500'
    case 'blue':
      return 'bg-sky-500'
    case 'gray':
      return 'bg-gray-400'
    default:
      return 'bg-gray-400'
  }
}

/** Short label for phase tabs (matches e.g. "Before go-live 3/12"). */
function phaseTabLabel(phase: PhaseDef): string {
  const i = phase.title.indexOf(' — ')
  return i >= 0 ? phase.title.slice(0, i) : phase.title
}

function taskStatusPillClass(s: TrustChecklistItemStatus): string {
  const base =
    'inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide'
  switch (s) {
    case 'complete':
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-900`
    case 'in-progress':
      return `${base} border-sky-200 bg-sky-50 text-sky-900`
    case 'planned':
      return `${base} border-amber-200 bg-amber-50 text-amber-900`
    case 'not-started':
      return `${base} border-gray-200 bg-gray-100 text-gray-700`
  }
}

function statusPillDisplay(s: TrustChecklistItemStatus): string {
  switch (s) {
    case 'complete':
      return 'Complete'
    case 'in-progress':
      return 'In progress'
    case 'planned':
      return 'Planned'
    case 'not-started':
      return 'Not started'
  }
}

function ChecklistTaskRow({
  task,
  isDone,
  onToggle,
}: {
  task: TaskDef
  isDone: boolean
  onToggle: () => void
}) {
  const displayStatus: TrustChecklistItemStatus | null =
    task.status !== undefined ? (isDone ? 'complete' : task.status) : null

  return (
    <li key={task.id}>
      <button
        type="button"
        aria-pressed={isDone}
        onClick={onToggle}
        className="flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50/80"
      >
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
          style={
            isDone
              ? { borderColor: CORAL, backgroundColor: CORAL }
              : { borderColor: '#d1d5db', backgroundColor: 'transparent' }
          }
          aria-hidden
        >
          {isDone ? (
            <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          {task.category ? (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">{task.category}</p>
          ) : null}
          <span className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-bold text-gray-900 ${isDone ? 'line-through text-gray-500' : ''}`}>{task.label}</span>
            {displayStatus !== null ? (
              <span className={taskStatusPillClass(displayStatus)}>{statusPillDisplay(displayStatus)}</span>
            ) : null}
          </span>
          <span className="mt-1 block text-sm text-gray-500">{task.description}</span>
        </span>
      </button>
    </li>
  )
}

export default function TrustChecklist() {
  const [completed, setCompleted] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePhaseIndex, setActivePhaseIndex] = useState(0)

  const completedSet = useMemo(() => new Set(completed), [completed])

  const doneCount = completed.length
  const pct = Math.round((doneCount / TOTAL_TASKS) * 100)

  const listingsLiveCount = completed.filter((id) => LISTING_LIVE_TASK_IDS.has(id)).length
  const landlordsContactedCount = completed.filter((id) => LANDLORD_CONTACT_TASK_IDS.has(id)).length

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: qErr } = await supabase
      .from('admin_checklist_progress')
      .select('completed_items')
      .eq('key', TRUST_KEY)
      .maybeSingle()
    if (qErr) {
      setError(qErr.message)
      setCompleted([])
    } else {
      setCompleted(parseCompletedItems(data?.completed_items))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function persistCompleted(next: number[]) {
    if (!isSupabaseConfigured) return
    const { error: upErr } = await supabase.from('admin_checklist_progress').upsert(
      {
        key: TRUST_KEY,
        completed_items: next,
      },
      { onConflict: 'key' },
    )
    if (upErr) {
      setError(upErr.message)
      void load()
    }
  }

  function toggleTask(id: number) {
    const next = completedSet.has(id) ? completed.filter((x) => x !== id) : [...completed, id].sort((a, b) => a - b)
    setCompleted(next)
    void persistCompleted(next)
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Trust checklist</h1>
          <p className="text-sm text-gray-500 mt-1">Track platform credibility and go-to-market readiness</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}

      <div className={adminTableWrapClass}>
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-10">
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-gray-700">
                  {doneCount} / {TOTAL_TASKS} done
                </p>
                <p className="text-sm text-gray-500">{pct}% complete</p>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: CORAL }}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800">
                  <span className="font-semibold text-gray-900">{listingsLiveCount}</span>
                  <span className="ml-1.5 text-gray-600">listings live</span>
                </span>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800">
                  <span className="font-semibold text-gray-900">{landlordsContactedCount}</span>
                  <span className="ml-1.5 text-gray-600">landlords contacted</span>
                </span>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800">
                  <span className="font-semibold text-gray-900">{pct}%</span>
                  <span className="ml-1.5 text-gray-600">complete</span>
                </span>
              </div>
            </div>

            <div
              className="flex flex-wrap gap-1 border-b border-gray-200 pb-px"
              role="tablist"
              aria-label="Checklist phases"
            >
              {PHASES.map((phase, index) => {
                const phaseDone = phase.taskIds.filter((tid) => completedSet.has(tid)).length
                const phaseTotal = phase.taskIds.length
                const isActive = activePhaseIndex === index
                const activeAmber = isActive && phase.tone === 'amber'
                return (
                  <button
                    key={phase.badgeLabel}
                    type="button"
                    role="tab"
                    id={`trust-phase-tab-${index}`}
                    aria-selected={isActive}
                    aria-controls={`trust-phase-panel-${index}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActivePhaseIndex(index)}
                    className={[
                      'rounded-t-lg px-3 py-2 text-sm font-medium transition-colors inline-flex items-center gap-2',
                      isActive
                        ? activeAmber
                          ? 'bg-white text-amber-800 border border-b-0 border-gray-200 -mb-px border-t-2 border-t-amber-500'
                          : 'bg-white text-[#FF6F61] border border-b-0 border-gray-200 -mb-px border-t-2 border-t-[#FF6F61]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <span className="truncate max-w-[11rem] sm:max-w-none">{phaseTabLabel(phase)}</span>
                    <span
                      className={[
                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                        isActive
                          ? activeAmber
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-[#FF6F61]/15 text-[#FF6F61]'
                          : 'bg-gray-100 text-gray-600',
                      ].join(' ')}
                    >
                      {phaseDone}/{phaseTotal}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="pt-8">
              {PHASES.map((phase, index) => {
                if (index !== activePhaseIndex) return null
                const phaseDone = phase.taskIds.filter((tid) => completedSet.has(tid)).length
                const phaseTotal = phase.taskIds.length
                return (
                  <section
                    key={phase.badgeLabel}
                    role="tabpanel"
                    id={`trust-phase-panel-${index}`}
                    aria-labelledby={`trust-phase-tab-${index}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                      <div
                        className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${toneBadgeClass(phase.tone)}`}
                      >
                        {phase.badgeLabel}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h2 className="text-lg font-semibold text-gray-900">{phase.title}</h2>
                          <span className="text-sm tabular-nums text-gray-500">
                            {phaseDone} / {phaseTotal} done
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{phase.subtitle}</p>
                      </div>
                    </div>
                    <div className={`mt-4 h-1 w-full max-w-md rounded-full ${phaseAccentBar(phase.tone)} opacity-80`} aria-hidden />

                    {phase.taskGroups ? (
                      <div className="mt-6 space-y-0">
                        {phase.taskGroups.map((group, gi) => (
                          <div key={group.label}>
                            {gi > 0 ? <div className="my-10 border-t border-gray-200" aria-hidden /> : null}
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">{group.label}</p>
                            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
                              {group.taskIds.map((taskId) => {
                                const task = TASKS_BY_ID[taskId]
                                if (!task) return null
                                const isDone = completedSet.has(taskId)
                                return (
                                  <ChecklistTaskRow
                                    key={taskId}
                                    task={task}
                                    isDone={isDone}
                                    onToggle={() => toggleTask(taskId)}
                                  />
                                )
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ul className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
                        {phase.taskIds.map((taskId) => {
                          const task = TASKS_BY_ID[taskId]
                          if (!task) return null
                          const isDone = completedSet.has(taskId)
                          return (
                            <ChecklistTaskRow
                              key={taskId}
                              task={task}
                              isDone={isDone}
                              onToggle={() => toggleTask(taskId)}
                            />
                          )
                        })}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
