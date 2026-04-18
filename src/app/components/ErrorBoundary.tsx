import { Component, type ReactNode } from 'react';
import { resolveGlcErrorHome } from '../lib/glc-error-home';
import { logger } from '../lib/logger';
import { GlcAppErrorScreen } from './GlcAppErrorScreen';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  supportRef?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, supportRef: crypto.randomUUID() };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    logger.error('[ErrorBoundary]', {
      message: error.message,
      name: error.name,
      component_stack: info.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, supportRef: undefined });
  };

  render() {
    if (this.state.hasError && this.state.supportRef) {
      const path = typeof window !== 'undefined' ? window.location.pathname : '/';
      const { href: homeHref, label: homeLabel } = resolveGlcErrorHome(path);
      const err = this.state.error;
      const technicalDetail = err ? `${err.name}: ${err.message}` : undefined;
      return (
        <GlcAppErrorScreen
          supportRef={this.state.supportRef}
          technicalDetail={technicalDetail}
          onRetry={this.handleRetry}
          homeHref={homeHref}
          homeLabel={homeLabel}
          title="Something went wrong"
        />
      );
    }
    return this.props.children;
  }
}
