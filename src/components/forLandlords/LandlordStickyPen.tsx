import { DeskPen } from '../desk'

type LandlordStickyPenProps = {
  visible: boolean
}

/**
 * Mid-scroll CTA — visible only between the grand desk and closing band.
 * Mobile: slim docked bar; desktop: restrained paper chip at lower-right.
 */
export default function LandlordStickyPen({ visible }: LandlordStickyPenProps) {
  return (
    <div
      className={[
        'landlord-sticky-pen pointer-events-none fixed inset-x-0 bottom-0 z-40 px-[var(--space-3)] pb-[max(var(--space-3),env(safe-area-inset-bottom))] transition-transform duration-[var(--dur-slow)] ease-[var(--ease-standard)] md:inset-x-auto md:right-[var(--space-4)] md:bottom-auto md:top-[58%] md:px-0 md:pb-0',
        visible
          ? 'translate-y-0 md:translate-y-[-50%]'
          : 'translate-y-full opacity-0 md:translate-y-[calc(-50%+var(--space-4))] md:opacity-0',
      ].join(' ')}
      aria-hidden={!visible}
    >
      <div
        className={[
          visible ? 'pointer-events-auto' : 'pointer-events-none',
          'mx-auto max-w-site md:mx-0',
          'rounded-[var(--radius-lg)] border border-[var(--quni-cream-border)] bg-[var(--quni-surface-1)]/95 p-[var(--space-2)] shadow-[var(--shadow-2)] backdrop-blur-sm',
          'md:max-w-[14rem] md:rounded-[var(--radius-pill)] md:px-[var(--space-1)] md:py-[var(--space-1)]',
        ].join(' ')}
      >
        <DeskPen
          to="/signup?role=landlord"
          variant="coral"
          className="!w-full rounded-[var(--radius-md)] md:rounded-[var(--radius-pill)]"
        >
          List my room <span className="desk-pen-arw" aria-hidden>→</span>
        </DeskPen>
      </div>
    </div>
  )
}
