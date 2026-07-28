import Desk from './Desk'
import DeskAnswerPanel from './DeskAnswerPanel'
import DeskInTray from './DeskInTray'
import DeskNameplate from './DeskNameplate'
import ReceptionField, { type ReceptionFieldSelectQuestion } from './ReceptionField'
import { QuniLogoHomeLink } from '../SiteBrandLockup'
import { DESK_NAMEPLATE_VARIANTS } from '../../lib/deskNameplateVariants'
import './desk.css'

/** Toggle Reception nameplate — set false to preview without it. */
export const SHOW_RECEPTION_NAMEPLATE = true

/** ≤12 words — copy law. */
const LETTERHEAD = 'Ask us anything — a straight answer, with the source.'

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
 * `/home-v3` Reception — condensed logo · letterhead · nameplate row + Places/Questions field.
 * Paper & ink: flat page/surface — no peach gradient.
 */
export default function FieldReceptionDesk({
  onSelectQuestion,
  answer = null,
  showNameplate = SHOW_RECEPTION_NAMEPLATE,
  className = '',
}: FieldReceptionDeskProps) {
  const answered = Boolean(answer?.text)
  const plateVariant = DESK_NAMEPLATE_VARIANTS.reception

  return (
    <Desk
      tone="paper"
      className={[
        'desk-settle !gap-1.5 !p-3 border border-[var(--quni-line)] bg-[var(--quni-page)] contain-none !shadow-none hover:!shadow-none hover:!translate-y-0',
        '[animation-delay:40ms]',
        answered ? 'shadow-[0_0_0_2px_rgba(255,111,97,0.45),var(--shadow-2)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      nameplate={
        <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <QuniLogoHomeLink className="shrink-0 [&_img]:h-7 [&_img]:sm:h-8" />
          <p className="m-0 min-w-0 flex-1 font-[family-name:var(--font-serif)] text-sm leading-snug text-[var(--quni-ink-3)]">
            {LETTERHEAD}
          </p>
          {showNameplate ? (
            <div className="ml-auto shrink-0">
              <DeskNameplate variant={plateVariant}>Reception</DeskNameplate>
            </div>
          ) : null}
        </div>
      }
      letterhead={<span className="sr-only">{LETTERHEAD}</span>}
      inTray={
        <DeskInTray className="mt-0 overflow-visible">
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
