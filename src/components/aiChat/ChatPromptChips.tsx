import type { PersonaKey } from '../../lib/aiChat/chatTypes'

type Props = {
  personaKey: PersonaKey
  onPick: (prompt: string) => void
  disabled?: boolean
}

const CHIPS: Record<PersonaKey, string[]> = {
  student_renter: ['Find rooms near UNSW', "What's included in rent?", 'How does verification work?'],
  landlord: ['Help me complete my listing', 'Draft a reply to an enquiry', 'How do payouts work?'],
  visitor: ['How does Quni work?', 'Is it free to list?', 'How are renters verified?'],
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
            'border-[#FF6F61]/30 bg-[#FFF8F0] text-[#CC4A3C] hover:bg-[#FF6F61]/10 hover:border-[#FF6F61]/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          {c}
        </button>
      ))}
    </div>
  )
}

