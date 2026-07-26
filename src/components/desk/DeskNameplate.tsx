import type { DeskNameplateVariant } from '../../lib/deskNameplateVariants'

export type { DeskNameplateVariant }

type DeskNameplateProps = {
  children: string
  className?: string
  /** Visual treatment — default `brass` preserves `/home-v2` control. */
  variant?: DeskNameplateVariant
  /**
   * Surface context. For `letterpress`: slightly brighter parchment on navy
   * (still a paper card — never inverted). For `bronze` / `darkPlate`: dark-surface alloys.
   */
  onDark?: boolean
}

const labelBase =
  'whitespace-nowrap text-[10.5px] font-bold uppercase tracking-[0.14em]'

/**
 * Slot 1 — WHO the desk serves.
 * Variants: brass (control) · darkPlate · bronze · letterpress · engraved.
 */
export default function DeskNameplate({
  children,
  className = '',
  variant = 'brass',
  onDark = false,
}: DeskNameplateProps) {
  if (variant === 'engraved') {
    return (
      <div
        className={['inline-flex max-w-full items-center gap-2', className].filter(Boolean).join(' ')}
      >
        <span
          aria-hidden
          className={[
            'inline-block h-px w-3 shrink-0',
            onDark ? 'bg-white/45' : 'bg-[var(--quni-ink-3)]',
          ].join(' ')}
        />
        <span
          className={[
            labelBase,
            'tracking-[0.16em]',
            onDark ? 'text-white/78' : 'text-[var(--quni-ink-2)]',
          ].join(' ')}
        >
          {children}
        </span>
      </div>
    )
  }

  if (variant === 'letterpress') {
    /* D · letterpress card — parchment pressed in; thicker bottom edge; no float shadow. */
    return (
      <div
        className={[
          'inline-flex max-w-full items-center rounded-[2px] px-[12px] py-[5px]',
          'border border-[var(--quni-cream-border)]',
          'border-b-[2.5px] border-b-[color-mix(in_srgb,var(--quni-cream-border)_50%,var(--quni-ink-4))]',
          onDark
            ? 'bg-[color-mix(in_srgb,var(--quni-cream)_82%,white)]'
            : 'bg-[color-mix(in_srgb,var(--quni-cream)_55%,var(--quni-cream-border))]',
          'shadow-[inset_0_1px_2px_color-mix(in_srgb,var(--quni-ink)_12%,transparent)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className={[labelBase, 'text-[var(--quni-ink-2)]'].join(' ')}>{children}</span>
      </div>
    )
  }

  if (variant === 'darkPlate') {
    if (onDark) {
      /* Light-on-dark counterpart — pale plate so it does not vanish into navy. */
      return (
        <div
          className={[
            'inline-flex max-w-full items-center rounded-[4px] px-[13px] py-[6px]',
            'border border-white/25 bg-[color-mix(in_srgb,white_88%,var(--quni-cream))]',
            'shadow-[0_1px_3px_rgba(0,0,0,0.35)]',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={[labelBase, 'text-[var(--quni-ink)]'].join(' ')}>{children}</span>
        </div>
      )
    }
    return (
      <div
        className={[
          'inline-flex max-w-full items-center rounded-[4px] px-[13px] py-[6px]',
          'border border-black/25 bg-[var(--quni-ink-2)]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_3px_rgba(0,0,0,0.28)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          className={[
            labelBase,
            'text-[color-mix(in_srgb,var(--quni-cream)_92%,white)]',
            '[text-shadow:0_1px_0_rgba(0,0,0,0.35)]',
          ].join(' ')}
        >
          {children}
        </span>
      </div>
    )
  }

  if (variant === 'bronze') {
    if (onDark) {
      /* Deeper alloy + pale engraved letters — reads on navy. */
      return (
        <div
          className={[
            'inline-flex max-w-full items-center rounded-[4px] px-[13px] py-[6px]',
            'border-t border-[color-mix(in_srgb,var(--quni-cream)_55%,transparent)]',
            'border-b border-black/50',
            'bg-[linear-gradient(165deg,#6B5228_0%,#4A3818_55%,#3D2E12_100%)]',
            'shadow-[0_1px_3px_rgba(0,0,0,0.4)]',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span
            className={[
              labelBase,
              'text-[#F3EBD8]',
              '[text-shadow:0_1px_0_rgba(0,0,0,0.4)]',
            ].join(' ')}
          >
            {children}
          </span>
        </div>
      )
    }
    return (
      <div
        className={[
          'inline-flex max-w-full items-center rounded-[4px] px-[13px] py-[6px]',
          'border-t border-white/50 border-b border-black/40',
          'bg-[linear-gradient(165deg,#C9A35A_0%,#B08948_55%,#8B6914_100%)]',
          'shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_1px_3px_rgba(0,0,0,0.28)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          className={[
            labelBase,
            'text-[#120C04]',
            '[text-shadow:0_1px_0_rgba(255,255,255,0.28)]',
          ].join(' ')}
        >
          {children}
        </span>
      </div>
    )
  }

  /* brass — control */
  return (
    <div
      className={[
        'inline-flex max-w-full items-center rounded-[4px] px-[13px] py-[6px]',
        'bg-[var(--quni-brass)] text-[var(--quni-brass-ink)]',
        'border-t border-white/34 border-b border-black/34',
        'shadow-[0_1px_3px_rgba(0,0,0,0.3)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={[labelBase, '[text-shadow:0_1px_0_rgba(255,255,255,0.28)]'].join(' ')}>
        {children}
      </span>
    </div>
  )
}
