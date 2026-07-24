import {
  dashboardDestructiveBtnClass,
  dashboardEditBtnClass,
  dashboardPrimaryBtnClass,
  dashboardSecondaryBtnClass,
} from './dashboardButtons'

export {
  dashboardDestructiveBtnClass,
  dashboardEditBtnClass,
  dashboardPrimaryBtnClass,
  dashboardSecondaryBtnClass,
}

/** Shared Tailwind classes for renter profile (R3a–R4). */

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

/** Alias of shared `dashboardPrimaryBtnClass` (+ form-row `self-start`). */
export const renterSaveBtnClass = `${dashboardPrimaryBtnClass} self-start whitespace-nowrap`

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

export const renterUploadBtnClass =
  'box-border flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-[var(--quni-line)] bg-[var(--quni-surface-1)] px-3 py-[11px] font-[inherit] text-[13px] font-semibold text-[var(--quni-ink-4)] hover:border-[var(--quni-coral)] hover:text-[var(--quni-coral)] disabled:cursor-not-allowed disabled:opacity-50'

export const renterUploadFilledClass =
  'flex min-w-0 items-center gap-2 rounded-[10px] border border-[var(--quni-success-border)] bg-[var(--quni-success-tint)] px-3 py-2.5 text-[13px] text-[var(--quni-success-fg)]'

export const renterUploadFilledTextClass =
  'min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap'

export const renterFilledRowActionClass =
  'shrink-0 cursor-pointer border-0 bg-transparent px-1 py-1.5 font-[inherit] text-[13px] font-semibold leading-tight text-[var(--quni-coral)] hover:text-[var(--quni-coral-hover)] disabled:cursor-not-allowed disabled:opacity-50'

export const renterPhotoRowClass = 'flex flex-wrap items-end gap-4'

export const renterPhotoPreviewClass =
  'h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-pill)] border border-[var(--quni-line)] bg-[var(--quni-surface-2)]'

/** Form-tied + Shell modal secondary. */
export const renterSecondaryBtnClass = dashboardSecondaryBtnClass

export const renterEmailBlockClass = 'flex flex-col gap-2'

export const renterEmailHintClass = 'm-0 text-xs leading-[1.45] text-[var(--quni-ink-4)]'

export const renterEmailWaitBoxClass =
  'rounded-[10px] border border-[var(--quni-line-soft)] bg-[var(--quni-surface-2)] px-[13px] py-[11px] text-xs leading-[1.45] text-[var(--quni-ink-3)] [&_ul]:mt-1.5 [&_ul]:pl-4'

export const renterEmailActionsClass = 'flex flex-wrap items-center gap-3'

/* ——— R4 page chrome ——— */

export const renterStackClass = 'mx-auto flex w-full max-w-[760px] flex-col gap-3'

export const renterOptionalDividerClass =
  'mx-0.5 my-2 flex items-center gap-[13px] text-center text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]'

export const renterOptionalDividerLineClass = 'h-px flex-1 bg-[var(--quni-line)]'

export const renterIconWrapClass =
  'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-[var(--quni-coral-tint-15)] text-[var(--quni-coral)]'

export const renterIconWrapLgClass =
  'flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[var(--radius-md)]'

export const renterEditBtnClass = dashboardEditBtnClass

export const renterVerifyPillClass =
  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] px-[11px] py-1.5 text-[11px] font-semibold tracking-[0.01em]'

export const renterVerifyPillDoneClass =
  'bg-[var(--quni-success-bg)] text-[var(--quni-success-fg)]'

export const renterVerifyPillReviewClass =
  'bg-[var(--quni-navy-tint)] text-[var(--quni-ink-4)]'

export const renterSituationGridClass =
  'grid grid-cols-2 gap-3 sm:grid-cols-6 sm:gap-2.5'

export const renterSituationTileClass =
  'relative flex cursor-pointer flex-col items-center justify-center gap-[9px] rounded-[14px] border border-[var(--quni-line)] bg-[var(--quni-surface-1)] px-2 py-4 font-[inherit] transition-[border-color,background] duration-[var(--dur-fast)] ease-[var(--ease-standard)] max-sm:px-3 max-sm:py-[18px] disabled:cursor-not-allowed disabled:opacity-50'

export const renterSituationTileSelectedClass =
  'border-[1.5px] border-[var(--quni-coral)] bg-[var(--quni-coral-tint)]'

export const renterSituationTileLabelClass =
  'text-center text-[length:var(--text-body-sm-size)] font-semibold leading-tight text-[var(--quni-ink-2)]'

export const renterSituationTileLabelSelectedClass = 'text-[var(--quni-ink)]'

export const renterNestedSectionClass =
  'mt-[15px] border-t border-[var(--quni-line-soft)] pt-4'

export const renterNestedHeaderClass =
  'flex w-full cursor-pointer select-none items-center gap-[11px] border-0 bg-transparent p-0 text-left'

export const renterNestedBodyClass = 'pt-4'
