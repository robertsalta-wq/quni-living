import { useState } from 'react'
import ChatPanel from '../aiChat/ChatPanel'
import ChatPromptChips, { type AudienceMode } from '../aiChat/ChatPromptChips'
import { useOpenAiChat } from '../../context/AiChatOpenContext'
import Desk from './Desk'
import DeskLetterhead from './DeskLetterhead'
import DeskNameplate from './DeskNameplate'
import DeskInTray from './DeskInTray'
import './desk.css'

type ReceptionDeskProps = {
  className?: string
  /** Mobile home stack: compact face that opens the full-screen helper. */
  mobileRail?: boolean
}

/**
 * Reception / Ask Quni desk — always-on helper on desktop (patient: never auto-opens).
 * Reuses ChatPanel + /api/chat; renter ↔ homeowner only changes suggested questions.
 */
export default function ReceptionDesk({ className = '', mobileRail = false }: ReceptionDeskProps) {
  const openChat = useOpenAiChat()
  const [audience, setAudience] = useState<AudienceMode>('renter')

  const toggle = (
    <div
      className="inline-flex rounded-full border border-[var(--quni-line)] bg-white/80 p-0.5 text-[11px] font-semibold"
      role="group"
      aria-label="Who are you asking as"
    >
      {(
        [
          { id: 'renter' as const, label: 'Renter' },
          { id: 'homeowner' as const, label: 'Homeowner' },
        ] as const
      ).map(({ id, label }) => {
        const active = audience === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setAudience(id)}
            className={[
              'rounded-full px-2.5 py-1 transition-colors',
              active
                ? 'bg-[var(--quni-navy)] text-white'
                : 'text-[var(--quni-ink-4)] hover:text-[var(--quni-ink)]',
            ].join(' ')}
            aria-pressed={active}
          >
            {label}
          </button>
        )
      })}
    </div>
  )

  if (mobileRail) {
    return (
      <article
        className={[
          'desk-shell desk-settle overflow-hidden rounded-[var(--radius-lg)] border border-[var(--quni-cream-border)] bg-[var(--quni-cream)] shadow-[var(--shadow-1)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="flex flex-col gap-2.5 px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <DeskNameplate>Ask Quni</DeskNameplate>
            {toggle}
          </div>
          <p className="m-0 font-display text-[15px] font-bold leading-snug text-[var(--quni-ink)]">
            Your front desk — fees, verification, or a careful tenancy pointer.
          </p>
          <ChatPromptChips
            audienceMode={audience}
            onPick={(prompt) => openChat({ draft: prompt, audienceMode: audience })}
            disabled={false}
          />
          <button
            type="button"
            onClick={() => openChat({ audienceMode: audience })}
            className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--quni-coral)] px-4 py-2.5 text-[13px] font-bold text-white shadow-[var(--shadow-1)] hover:bg-[var(--quni-coral-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
          >
            Open Ask Quni →
          </button>
        </div>
      </article>
    )
  }

  return (
    <Desk
      tone="cream"
      className={[
        'desk-settle min-h-0 flex-1 !gap-2 border border-[var(--quni-cream-border)]',
        '[animation-delay:90ms]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        background: 'linear-gradient(165deg, var(--quni-cream) 0%, var(--quni-surface-1) 100%)',
      }}
      nameplate={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <DeskNameplate>Ask Quni</DeskNameplate>
          {toggle}
        </div>
      }
      letterhead={
        <DeskLetterhead className="text-[17px] text-[var(--quni-ink)] sm:text-[18px]">
          Ask anything — product answers freely; tenancy only from verified sources.
        </DeskLetterhead>
      }
      inTray={
        <DeskInTray className="mt-0.5 min-h-0 flex-1">
          <ChatPanel variant="reception" audienceMode={audience} />
        </DeskInTray>
      }
    />
  )
}
