import type { PersonaKey } from '../../lib/aiChat/chatTypes'

type Props = {
  personaKey: PersonaKey
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

export default function ChatPromptChips({ personaKey, onPick, disabled }: Props) {
  const chips = CHIPS[personaKey]

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

