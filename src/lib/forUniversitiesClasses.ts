/** Shared Tailwind classes for /for-universities (screen). Print chrome lives in index.css. */

export const uniDocClass =
  'for-universities-doc text-[0.9375rem] leading-[1.55] text-[var(--quni-ink)] [&_p]:mb-3.5 [&_p]:mt-0 [&_strong]:font-bold [&_strong]:text-[var(--quni-coral-active)]'

export const uniShellClass =
  'for-universities-shell mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8'

export const uniWebOnlyClass = 'print:hidden'

export const uniPrintOnlyClass = 'hidden print:block'

export const uniCredentialClass =
  'partnership-credential mb-5 border-b border-[var(--quni-line)] pb-2 text-[0.6875rem] uppercase tracking-[0.09em] text-[var(--quni-ink-4)]'

export const uniMastheadClass =
  'partnership-masthead mb-5 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end'

export const uniLogoClass = 'partnership-logo [&_img]:block [&_img]:h-9 [&_img]:w-auto'

export const uniEyebrowClass =
  'partnership-eyebrow max-w-none text-left text-[0.6875rem] uppercase leading-[1.35] tracking-[0.05em] text-[var(--quni-ink-4)] md:max-w-[58%] md:text-right'

export const uniLedeClass =
  'partnership-lede font-display mb-4 mt-0 text-[clamp(1.375rem,2.5vw,1.75rem)] leading-[1.2] text-[var(--quni-ink)]'

export const uniCtaClass =
  'mb-5 inline-flex cursor-pointer items-center justify-center rounded-lg border-0 bg-[var(--quni-coral)] px-[1.125rem] py-2.5 text-[0.9375rem] font-semibold text-[var(--quni-surface-1)] transition-[background-color,opacity] duration-150 ease-in-out hover:bg-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]'

export const uniEnquiryClass = 'mt-6 border-t border-[var(--quni-line)] pt-5'

export const uniEnquiryHeadingClass =
  'font-display mb-3.5 mt-0 text-[clamp(1.25rem,2.2vw,1.5rem)] leading-[1.2] text-[var(--quni-ink)]'

export const uniEnquiryCopyClass = 'mb-3 mt-0 text-[0.9375rem] text-[var(--quni-ink)]'

export const uniFormClass = 'mt-4 grid max-w-lg gap-3.5'

export const uniFormFieldClass = 'min-w-0'

export const uniLabelClass =
  'mb-1.5 block text-[0.8125rem] font-semibold text-[var(--quni-ink)]'

export const uniInputClass =
  'box-border w-full rounded-md border border-[var(--quni-line)] bg-[var(--quni-surface-1)] px-3 py-2 text-[0.9375rem] text-[var(--quni-ink)] transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-[var(--quni-coral)] focus:outline-none focus:shadow-[0_0_0_2px_var(--quni-coral-tint-15)] aria-[invalid=true]:border-[var(--quni-danger)]'

export const uniTextareaClass = `${uniInputClass} min-h-24 resize-y leading-[1.45]`

export const uniFieldErrorClass = 'mt-1.5 mb-0 text-[0.8125rem] text-[var(--quni-danger)]'

export const uniCaptchaLabelClass =
  'mb-2 text-[0.8125rem] font-semibold text-[var(--quni-ink)]'

export const uniSubmitClass =
  'justify-self-start cursor-pointer rounded-lg border-0 bg-[var(--quni-coral)] px-5 py-2.5 text-[0.9375rem] font-semibold text-[var(--quni-surface-1)] transition-[background-color,opacity] duration-150 ease-in-out hover:enabled:bg-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)] disabled:cursor-not-allowed disabled:opacity-65'

export const uniFormSuccessClass =
  'mt-4 mb-0 rounded-md border border-[var(--quni-line)] bg-[var(--quni-trust-bg)] px-3.5 py-3 text-[0.9375rem] text-[var(--quni-ink)]'

export const uniFormErrorClass =
  'm-0 rounded-md border border-[color-mix(in_srgb,var(--quni-danger)_40%,transparent)] bg-[var(--quni-danger-bg)] px-3.5 py-3 text-[0.875rem] text-[var(--quni-danger-fg)]'

export const uniSectionTitleClass =
  'partnership-section-title mb-2.5 mt-6 border-b border-[var(--quni-line)] pb-1.5 text-[0.8125rem] font-bold tracking-[0.02em] text-[var(--quni-coral-active)]'

export const uniPillarsClass =
  'partnership-pillars mb-1 mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-2.5'

export const uniPillarClass =
  'partnership-pillar rounded border border-[var(--quni-line)] border-l-[3px] border-l-[var(--quni-coral)] bg-[var(--quni-trust-bg)] p-3.5 [&_h3]:mb-1.5 [&_h3]:mt-0 [&_h3]:text-[0.875rem] [&_h3]:font-bold [&_h3]:text-[var(--quni-ink)] [&_p:last-child]:mb-0'

export const uniPillarAuditClass =
  'partnership-pillar-audit mt-2.5 border-t border-dashed border-[var(--quni-line)] pt-2.5'

export const uniColsClass =
  'partnership-cols mt-0.5 md:columns-2 md:gap-5 [&_li]:mb-2.5 md:[&_li]:break-inside-avoid [&_ul]:my-0.5 [&_ul]:pl-[1.125rem]'

export const uniScopeClass =
  'partnership-scope mt-5 rounded border border-[var(--quni-cream-border)] bg-[var(--quni-surface-2)] px-3.5 py-3 text-[0.8125rem] text-[var(--quni-ink-4)]'

export const uniDocFooterClass =
  'mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t-2 border-[var(--quni-coral)] pt-3'

export const uniTalkClass = 'text-[0.875rem] font-bold text-[var(--quni-ink)]'

export const uniContactClass =
  'text-[0.8125rem] text-[var(--quni-ink-4)] [&_a]:font-semibold [&_a]:text-[var(--quni-coral-active)] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[var(--quni-coral)]'

export const uniTagClass =
  'font-display text-[0.8125rem] italic text-[var(--quni-coral-active)]'

export const uniPrintBtnClass =
  'mb-5 inline-flex cursor-pointer items-center justify-center rounded-lg border border-[var(--quni-coral)] bg-[var(--quni-surface-1)] px-4 py-2 text-[0.875rem] font-semibold text-[var(--quni-coral-active)] transition-[background-color,color] duration-150 ease-in-out hover:bg-[var(--quni-coral-tint)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]'

export const uniPrintContactClass =
  'partnership-print-contact'
