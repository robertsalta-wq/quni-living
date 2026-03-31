import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import * as Sentry from '@sentry/react'

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [email, setEmail] = useState('')
  const [thanks, setThanks] = useState(false)
  const titleId = useId()

  const close = useCallback(() => {
    setOpen(false)
    setThanks(false)
    setText('')
    setEmail('')
  }, [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const feedback = text.trim()
    if (!feedback) return
    Sentry.captureMessage('User feedback: ' + feedback, {
      level: 'info',
      extra: { email, feedback },
    })
    setThanks(true)
    window.setTimeout(() => {
      close()
    }, 2000)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] rounded-full border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
      >
        Report a problem
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) close()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {thanks ? (
              <p className="text-center text-sm font-medium text-gray-900" id={titleId}>
                Thanks, we&apos;ll look into it!
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 id={titleId} className="text-lg font-semibold text-gray-900">
                  Report a problem
                </h2>
                <div>
                  <label htmlFor="feedback-text" className="sr-only">
                    What went wrong?
                  </label>
                  <textarea
                    id="feedback-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What went wrong?"
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="feedback-email" className="sr-only">
                    Your email (optional)
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email (optional)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!text.trim()}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
