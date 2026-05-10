import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'
import { Icon, type IconName } from '../Icon'

export type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: ButtonKind
  size?: ButtonSize
  icon?: IconName
  iconRight?: IconName
  children?: ReactNode
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'gap-1.5 rounded-admin-sm px-2.5 py-1 text-[12px]',
  md: 'gap-1.5 rounded-admin-md px-3.5 py-2 text-[13px]',
  lg: 'gap-2 rounded-admin-md px-[18px] py-2.5 text-[14px]',
}

const ICON_SIZE: Record<ButtonSize, number> = { sm: 14, md: 15, lg: 16 }

const KIND_CLASSES: Record<ButtonKind, string> = {
  primary:
    'border border-admin-coral bg-admin-coral text-white hover:bg-admin-coral-hover active:bg-admin-coral-active',
  secondary:
    'border border-admin-navy bg-admin-navy text-white hover:bg-admin-navy/90',
  ghost:
    'border border-admin-line bg-white text-admin-ink-2 hover:bg-admin-surface-2',
  link: 'border-0 bg-transparent p-0 text-admin-coral-active hover:text-admin-coral-hover',
}

/**
 * Admin primary button.
 *
 * Per HANDOFF.md §2 we accept four kinds (primary / secondary / ghost / link)
 * and three sizes. Icons are referenced by `IconName`, not inline SVGs.
 * The `link` kind ignores `size` padding because it sits inline with text.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { kind = 'primary', size = 'md', icon, iconRight, children, className, type, ...rest },
  ref,
) {
  const isLink = kind === 'link'
  const cls = [
    'inline-flex items-center whitespace-nowrap font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-coral focus-visible:ring-offset-1 focus-visible:ring-offset-white',
    isLink ? 'gap-1 text-[13px]' : SIZE_CLASSES[size],
    KIND_CLASSES[kind],
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button ref={ref} type={type ?? 'button'} className={cls} {...rest}>
      {icon ? <Icon name={icon} size={ICON_SIZE[size]} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={ICON_SIZE[size]} /> : null}
    </button>
  )
})
