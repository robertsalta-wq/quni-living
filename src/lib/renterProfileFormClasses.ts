/** Shared Tailwind field/layout classes for renter profile forms (R3a). */

export const renterLabelClass =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] leading-[1.35] text-[var(--quni-ink-5)]'

export const renterFieldWrapClass = 'flex min-w-0 flex-col'

/** Input / select share the same control chrome; keep --quni-line (not --quni-input-border). */
export const renterInputClass =
  'box-border w-full rounded-[var(--radius-md)] border border-[var(--quni-line)] bg-[var(--quni-surface-1)] px-3 py-2.5 font-[inherit] text-[length:var(--text-body-sm-size)] text-[var(--quni-ink-2)] focus:border-[var(--quni-coral)] focus:outline-none focus:shadow-[var(--shadow-focus)]'

export const renterSelectClass = renterInputClass

export const renterTextareaClass = `${renterInputClass} min-h-[88px] resize-y leading-relaxed`

const renterControlErrorClass =
  '!border-[var(--quni-danger-fg)] shadow-[0_0_0_1px_var(--quni-danger-fg)] focus:!border-[var(--quni-danger-fg)] focus:shadow-[0_0_0_2px_rgba(220,38,38,0.25)]'

/** Append danger morph to a control class string (same role as landlord inputClassForError). */
export function renterControlClass(baseClass: string, hasError: boolean): string {
  return hasError ? `${baseClass} ${renterControlErrorClass}` : baseClass
}

export function renterInputClassForError(hasError: boolean): string {
  return renterControlClass(renterInputClass, hasError)
}

export const renterFormGridClass =
  'grid grid-cols-[repeat(auto-fit,minmax(232px,1fr))] gap-x-4 gap-y-[15px]'

export const renterFormGridStackClass = 'grid grid-cols-1 gap-x-4 gap-y-[15px]'

export const renterFormActionsClass = 'col-span-full flex items-center gap-3'

export const renterFormActionsColumnClass =
  'col-span-full flex flex-col items-stretch gap-3'

export const renterSaveBtnClass =
  'inline-flex items-center justify-center self-start whitespace-nowrap rounded-[var(--radius-md)] border-0 bg-[var(--quni-coral)] px-[18px] py-2.5 font-[inherit] text-[length:var(--text-body-sm-size)] font-semibold text-[var(--quni-surface-1)] hover:bg-[var(--quni-coral-hover)] disabled:cursor-not-allowed disabled:opacity-50'

export const renterFieldGroupHeadingClass =
  'col-span-full m-0 mt-1.5 text-[length:var(--text-body-sm-size)] font-semibold leading-[1.35] tracking-[-0.01em] text-[var(--quni-ink)]'

export const renterSectionErrorClass =
  'col-span-full m-0 mb-1 rounded-[var(--radius-md)] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] px-3 py-2.5 text-[length:var(--text-body-sm-size)] text-[var(--quni-danger-fg)]'

export const renterFieldErrorClass = 'mt-1 mb-0 text-xs text-[var(--quni-danger-fg)]'

export const renterSaveHintClass = 'm-0 text-xs text-[var(--quni-danger-fg)]'

export const renterWriteErrorClass =
  'col-span-full m-0 text-[length:var(--text-body-sm-size)] text-[var(--quni-danger-fg)]'

export const renterSuccessFlashClass =
  'col-span-full m-0 text-[length:var(--text-body-sm-size)] text-[var(--quni-success-fg)]'

export const renterCheckboxErrorClass =
  'outline outline-2 outline-offset-2 outline-[var(--quni-danger-fg)]'

export const renterNoteClass =
  'mt-[15px] flex items-start gap-[9px] rounded-[var(--radius-md)] border border-[var(--quni-line-soft)] bg-[var(--quni-surface-2)] px-[13px] py-[11px] text-[12.5px] leading-normal text-[var(--quni-ink-4)]'

export const renterFullWidthClass = 'col-span-full'
