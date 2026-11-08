import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logTelemetryEvent, generateTraceContext } from '../../utils/telemetry';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  traceId: string;
}

/**
 * Enterprise React Error Boundary.
 * Catches unhandled rendering exceptions, logs telemetry with a unique trace ID,
 * and displays an anti-slop, accessible error fallback screen with retry options.
 */
export class ObservabilityErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
    traceId: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    const { traceId } = generateTraceContext();
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected rendering error occurred',
      traceId
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logTelemetryEvent({
      type: 'ERROR',
      message: `React render error: ${error.message}`,
      traceId: this.state.traceId,
      metadata: {
        componentStack: errorInfo.componentStack,
        errorStack: error.stack
      }
    });
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      errorMessage: '',
      traceId: ''
    });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex items-center justify-center p-6" data-testid="observability-error-boundary">
          <div className="max-w-md w-full bg-[var(--color-bg-surface,#18181b)] border border-[var(--color-border,#27272a)] rounded-xl p-6 shadow-xl text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-semibold text-[var(--color-text-primary,#fafafa)] mb-2">
              {this.props.fallbackTitle || 'Component Execution Error'}
            </h3>

            <p className="text-sm text-[var(--color-text-secondary,#a1a1aa)] mb-4">
              {this.state.errorMessage}
            </p>

            {this.state.traceId && (
              <div className="bg-[var(--color-bg-base,#09090b)] border border-[var(--color-border,#27272a)] rounded p-2 text-xs font-mono text-[var(--color-text-muted,#71717a)] mb-5 select-all">
                Incident Trace ID: {this.state.traceId}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--color-primary,#3b82f6)] text-white hover:bg-[var(--color-primary-hover,#2563eb)] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
