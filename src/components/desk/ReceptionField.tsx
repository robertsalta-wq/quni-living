import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DESK_RECEPTION_SUGGESTED_CHIPS,
  deskFaqById,
  isDeskReceptionAssistantEnabled,
  type DeskFaqItem,
} from '../../lib/deskFaqIndex'
import type { DeskPlace } from '../../lib/deskPlacesFixture'
import {
  deskReceptionSubmitLabel,
  matchDeskReceptionQuery,
  placeListingsPath,
} from '../../lib/deskReceptionMatch'

export type ReceptionFieldSelectQuestion = (item: DeskFaqItem) => void

type ReceptionFieldProps = {
  onSelectQuestion: ReceptionFieldSelectQuestion
  className?: string
}

type FlatOption =
  | { kind: 'place'; place: DeskPlace }
  | { kind: 'question'; item: DeskFaqItem }

/**
 * Places / Questions field for `/home-v3` Reception.
 * Never guesses: local match only; place → navigate; question → parent; no-match → message.
 * parseDeskIntent keyword redirects are explicitly off.
 */
export default function ReceptionField({ onSelectQuestion, className = '' }: ReceptionFieldProps) {
  const navigate = useNavigate()
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [trayOpen, setTrayOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [noMatchNote, setNoMatchNote] = useState(false)

  const matches = matchDeskReceptionQuery(query)
  const flat: FlatOption[] = [
    ...matches.places.map((place) => ({ kind: 'place' as const, place })),
    ...matches.questions.map((item) => ({ kind: 'question' as const, item })),
  ]
  const hasQuery = query.trim().length > 0
  const showTray = trayOpen && hasQuery
  const submitLabel = deskReceptionSubmitLabel(query, matches)

  useEffect(() => {
    setActiveIndex(-1)
    setNoMatchNote(false)
  }, [query])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setTrayOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function selectPlace(place: DeskPlace) {
    setQuery(place.label)
    setTrayOpen(false)
    setNoMatchNote(false)
    navigate(placeListingsPath(place))
    inputRef.current?.focus()
  }

  function selectQuestion(item: DeskFaqItem) {
    setQuery(item.question)
    setTrayOpen(false)
    setNoMatchNote(false)
    onSelectQuestion(item)
    inputRef.current?.focus()
  }

  function selectOption(opt: FlatOption) {
    if (opt.kind === 'place') selectPlace(opt.place)
    else selectQuestion(opt.item)
  }

  function onChip(faqId: string) {
    const item = deskFaqById(faqId)
    if (!item) return
    selectQuestion(item)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (activeIndex >= 0 && flat[activeIndex]) {
      selectOption(flat[activeIndex])
      return
    }
    if (flat.length === 1) {
      selectOption(flat[0])
      return
    }
    if (flat.length === 0 && hasQuery) {
      setNoMatchNote(true)
      setTrayOpen(true)
      if (isDeskReceptionAssistantEnabled()) {
        // Tier 4 named no-op for this PR.
      }
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setTrayOpen(false)
      setActiveIndex(-1)
      return
    }
    if (!showTray || flat.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % flat.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectOption(flat[activeIndex])
    }
  }

  return (
    <div ref={wrapRef} className={['relative z-20', className].filter(Boolean).join(' ')}>
      <div className="overflow-hidden rounded-[12px] border border-[var(--quni-line)] bg-[var(--quni-surface-1)]">
        <form onSubmit={onSubmit} className="flex items-center gap-2 py-0 pl-3.5 pr-1.5">
          <span aria-hidden className="text-[15px] font-extrabold text-[var(--quni-coral-active)]">
            ⌕
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setTrayOpen(true)
            }}
            onFocus={() => setTrayOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search a suburb — or ask us anything…"
            aria-label="Search a place or ask a question"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showTray}
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
            }
            role="combobox"
            autoComplete="off"
            className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[14px] text-[var(--quni-ink)] outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-[9px] bg-[var(--quni-coral)] px-3.5 py-1.5 text-[13px] font-extrabold text-[var(--quni-ink)] shadow-[0_4px_12px_rgba(255,111,97,0.3)] hover:bg-[var(--quni-coral-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
          >
            {submitLabel}
          </button>
        </form>

        <div
          className="flex flex-wrap gap-1.5 border-t border-[var(--quni-line)] bg-[var(--quni-page)] px-2.5 py-2"
          role="group"
          aria-label="Suggested questions"
        >
          {DESK_RECEPTION_SUGGESTED_CHIPS.map((chip) => (
            <button
              key={chip.faqId}
              type="button"
              onClick={() => onChip(chip.faqId)}
              className="rounded-full border border-[var(--quni-line)] bg-[var(--quni-surface-1)] px-2.5 py-1 text-[11px] font-semibold text-[var(--quni-ink-3)] transition-colors hover:border-[var(--quni-coral-border)] hover:text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {showTray ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Places and questions"
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-40 max-h-[min(220px,36vh)] overflow-y-auto rounded-[12px] border border-[var(--quni-line)] bg-[var(--quni-surface-1)] py-2 shadow-[var(--shadow-2)]"
        >
          {matches.places.length > 0 ? (
            <>
              <div className="px-4 pt-1.5 pb-1 text-[8.5px] font-extrabold tracking-[0.16em] text-[var(--quni-ink-5)] uppercase">
                Places
              </div>
              {matches.places.map((place, i) => {
                const idx = i
                const active = idx === activeIndex
                return (
                  <button
                    key={place.label}
                    type="button"
                    id={`${listId}-opt-${idx}`}
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectPlace(place)}
                    className={[
                      'flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-[var(--quni-ink)]',
                      active ? 'bg-[var(--quni-coral-tint)]' : 'hover:bg-[var(--quni-surface-2)]',
                    ].join(' ')}
                  >
                    <span
                      aria-hidden
                      className="inline-flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[5px] bg-[var(--quni-coral-tint)] text-[10px] font-extrabold text-[var(--quni-coral-active)]"
                    >
                      ⌕
                    </span>
                    <span className="min-w-0 flex-1 truncate">{place.label}</span>
                    <span className="shrink-0 text-[11px] font-semibold text-[var(--quni-ink-5)]">
                      {place.hint}
                    </span>
                  </button>
                )
              })}
            </>
          ) : null}

          {matches.questions.length > 0 ? (
            <>
              <div className="px-4 pt-1.5 pb-1 text-[8.5px] font-extrabold tracking-[0.16em] text-[var(--quni-ink-5)] uppercase">
                Questions
              </div>
              {matches.questions.map((item, i) => {
                const idx = matches.places.length + i
                const active = idx === activeIndex
                return (
                  <button
                    key={item.id}
                    type="button"
                    id={`${listId}-opt-${idx}`}
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectQuestion(item)}
                    className={[
                      'flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-[var(--quni-ink)]',
                      active ? 'bg-[var(--quni-coral-tint)]' : 'hover:bg-[var(--quni-surface-2)]',
                    ].join(' ')}
                  >
                    <span
                      aria-hidden
                      className="inline-flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[5px] bg-[var(--quni-verified-surface)] text-[10px] font-extrabold text-[var(--quni-verified)]"
                    >
                      ?
                    </span>
                    <span className="min-w-0 flex-1">{item.question}</span>
                  </button>
                )
              })}
            </>
          ) : null}

          {flat.length === 0 ? (
            <p className="m-0 border-t border-dotted border-[var(--quni-line)] px-4 pt-2 pb-1 font-[family-name:var(--font-serif)] text-[10.5px] text-[var(--quni-ink-5)] italic">
              {noMatchNote
                ? 'No match yet.'
                : 'No match yet — pick a place to search, or a question to be answered.'}
            </p>
          ) : (
            <p className="m-0 border-t border-dotted border-[var(--quni-line)] px-4 pt-2 pb-1 font-[family-name:var(--font-serif)] text-[10.5px] text-[var(--quni-ink-5)] italic">
              Pick a place to search, or a question to be answered.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
