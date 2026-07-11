/** Left-aligned three-dot typing bubble for counterparty activity. */
export default function TypingIndicator() {
  return (
    <div className="flex justify-start gap-2" aria-live="polite">
      <div className="w-8 shrink-0" aria-hidden />
      <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-gray-100 px-4 py-3 shadow-sm">
        <span className="inline-flex items-center gap-0.5" aria-label="Typing">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.2s]" />
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.1s]" />
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" />
        </span>
      </div>
    </div>
  )
}
