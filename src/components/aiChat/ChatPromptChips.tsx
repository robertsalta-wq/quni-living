import type { PersonaKey } from '../../lib/aiChat/chatTypes'

export type AudienceMode = 'renter' | 'homeowner'

type Props = {
  /** Auth-derived persona chips (widget / embed default). */
  personaKey?: PersonaKey
  /** Reception desk renter ↔ homeowner switch (overrides persona chips when set). */
  audienceMode?: AudienceMode
  onPick: (prompt: string) => void
  disabled?: boolean
}

const CHIPS: Record<PersonaKey, string[]> = {
  student_renter: [
    'Find rooms near UNSW',
    'How do I know the landlord is verified?',
    'What do I pay when I book?',
    'How does verification work?',
    'Where can I preview sample agreements?',
  ],
  landlord: [
    'Why do I need Stripe to accept bookings?',
    'Where can I see sample agreements?',
    'Help me complete my listing',
    'Listing vs Managed payments',
    'How do payouts work?',
  ],
  visitor: [
    'How does Quni work?',
    'How are landlords verified?',
    'Is it free for students to book?',
    'How are renters verified?',
  ],
}

/** Suggested questions for the reception desk audience toggle. */
export const AUDIENCE_CHIPS: Record<AudienceMode, string[]> = {
  renter: [
    'How does Quni work for renters?',
    'How are landlords verified?',
    'What do I pay when I book?',
    'How does renter verification work?',
  ],
  homeowner: [
    'What does it cost to list a room?',
    'Listing vs Managed — what’s the difference?',
    'How are renters verified before I accept?',
    'Can I list a spare room in NSW?',
  ],
}

export default function ChatPromptChips({
  personaKey = 'visitor',
  audienceMode,
  onPick,
  disabled,
}: Props) {
  const chips = audienceMode ? AUDIENCE_CHIPS[audienceMode] : CHIPS[personaKey]

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={c}
          type="button"
          disabled={disabled}
          onClick={() => onPick(c)}
          className={[
            'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
            'border-admin-coral/30 bg-[var(--quni-coral-soft)] text-[var(--quni-coral-active)] hover:bg-admin-coral/10 hover:border-admin-coral/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
