import { Component } from 'react'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  errorMessage: string
  errorStack?: string
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' }

  static getDerivedStateFromError(error: unknown): State {
    if (error instanceof Error) {
      return {
        hasError: true,
        errorMessage: error.message || 'Unknown error',
        errorStack: error.stack,
      }
    }

    return {
      hasError: true,
      errorMessage: typeof error === 'string' ? error : 'Unknown error',
    }
  }

  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('[AppErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6 text-gray-900">
        <div className="max-w-xl w-full text-center">
          <h1 className="text-xl font-bold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-gray-600 mt-2 mb-4">This page failed to render. You can reload or return home.</p>
          <div className="text-left">
            <p className="text-sm font-medium text-red-700">Error</p>
            <pre className="mt-2 p-3 bg-red-50 border border-red-200 text-xs text-red-900 rounded overflow-auto whitespace-pre-wrap">
              {this.state.errorMessage}
              {this.state.errorStack ? `\n\n${this.state.errorStack}` : ''}
            </pre>
          </div>
          <div className="mt-5 flex gap-3 justify-center flex-wrap">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800"
            >
              Reload
            </button>
            <a
              href="/"
              className="rounded-lg border border-gray-200 bg-white text-gray-900 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Go to homepage
            </a>
          </div>
        </div>
      </div>
    )
  }
}

