import Desk from './Desk'
import DeskAnswerPanel from './DeskAnswerPanel'
import DeskInTray from './DeskInTray'
import DeskLetterhead from './DeskLetterhead'
import DeskNameplate from './DeskNameplate'
import ReceptionField, { type ReceptionFieldSelectQuestion } from './ReceptionField'
import './desk.css'

/** Toggle Reception brass nameplate — set false to preview without it. */
export const SHOW_RECEPTION_NAMEPLATE = true

const LETTERHEAD =
  "Renting a room, or letting one? Ask us anything — a straight answer, with the source, or we'll point you to who knows."

export type FieldReceptionAnswer = {
  text: string
  source: string
} | null

type FieldReceptionDeskProps = {
  onSelectQuestion: ReceptionFieldSelectQuestion
  answer?: FieldReceptionAnswer
  showNameplate?: boolean
  className?: string
}

/**
 * `/home-v3` Reception — wordmark + Places/Questions field.
 * Not the AI ChatPanel Reception (that lives on other experiments). New composition only.
 */
export default function FieldReceptionDesk({
  onSelectQuestion,
  answer = null,
  showNameplate = SHOW_RECEPTION_NAMEPLATE,
  className = '',
}: FieldReceptionDeskProps) {
  const answered = Boolean(answer?.text)

  return (
    <Desk
      tone="cream"
      className={[
        'desk-settle !gap-2 border border-[var(--quni-cream-border)] contain-none',
        '[animation-delay:40ms]',
        answered
          ? 'shadow-[0_0_0_2px_rgba(255,111,97,0.45),var(--shadow-2)]'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        background: 'linear-gradient(150deg, var(--quni-cream) 0%, #FFF1E4 62%, #FFE8DC 100%)',
      }}
      nameplate={
        <div className="flex w-full flex-wrap items-start justify-between gap-3">
          <p className="m-0 font-[family-name:var(--font-serif)] text-[33px] leading-none font-bold tracking-[-0.015em] text-[var(--quni-ink)]">
            <span className="text-[var(--quni-coral)]">Q</span>uni
          </p>
          {showNameplate ? <DeskNameplate>Reception</DeskNameplate> : <span />}
        </div>
      }
      letterhead={
        <DeskLetterhead className="!max-w-[640px] !text-[17px] !leading-snug !text-[var(--quni-ink-3)]">
          {LETTERHEAD}
        </DeskLetterhead>
      }
      inTray={
        <DeskInTray className="mt-0.5 overflow-visible">
          <ReceptionField onSelectQuestion={onSelectQuestion} />
          <DeskAnswerPanel
            open={answered}
            answer={answer?.text ?? ''}
            source={answer?.source ?? 'QUNI FAQ'}
            tone="cream"
          />
        </DeskInTray>
      }
    />
  )
}
