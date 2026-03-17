import { Component, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="text-center p-8 max-w-md">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--score-1-bg)', border: '1px solid var(--score-1-border)' }}
            >
              <RefreshCw className="w-5 h-5" style={{ color: 'var(--score-1)' }} />
            </div>
            <h2
              className="font-semibold mb-2"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-xl)',
                color: 'var(--text-primary)',
                letterSpacing: 'var(--tracking-tight)',
              }}
            >
              Something went wrong
            </h2>
            <p
              className="mb-6 text-sm leading-relaxed"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <button onClick={this.handleRetry} className="glc-btn-primary">
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
