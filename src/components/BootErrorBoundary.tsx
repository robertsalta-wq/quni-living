import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

/**
 * Lightweight error UI for first paint. Sentry's ErrorBoundary is swapped in after
 * idle init so @sentry/react is not on the homepage critical path.
 */
export default class BootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[BootErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white px-6 text-center text-gray-900">
          <p className="text-base font-medium">Something went wrong. Please reload the page.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
