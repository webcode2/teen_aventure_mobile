import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Changing this value (e.g. the pathname) clears a caught error. */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Keeps one failing page from blanking the whole app; navigating away resets it. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page failed to render', error, info.componentStack);
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto my-16 max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-xs">
        <h2 className="text-lg font-bold text-navy">Something went wrong on this page</h2>
        <p className="mt-2 text-sm text-text-2">Your other pages still work. Try again, or go back and reopen this page.</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-4 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }
}
