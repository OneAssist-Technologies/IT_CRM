import React, { Component, ErrorInfo, ReactNode } from 'react';
import { getAppPath } from '../../config/env';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = getAppPath('/settings');
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = getAppPath('/');
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8FAFC',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 640,
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 32,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: '#FEE2E2',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                marginBottom: 16,
              }}
            >
              ⚠️
            </div>
            <h2 style={{ margin: '0 0 8px', color: '#0F172A', fontSize: 20, fontWeight: 700 }}>
              An error occurred while loading this view
            </h2>
            <p style={{ margin: '0 0 16px', color: '#64748B', fontSize: 14 }}>
              The application encountered an unexpected runtime error.
            </p>

            <div
              style={{
                backgroundColor: '#F1F5F9',
                borderRadius: 8,
                padding: 12,
                marginBottom: 20,
                fontSize: 12,
                fontFamily: 'monospace',
                color: '#DC2626',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                maxHeight: 300,
              }}
            >
              <div><strong>{this.state.error?.name || 'Error'}: {this.state.error?.message || String(this.state.error)}</strong></div>
              {this.state.error?.stack && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#64748B' }}>
                  {this.state.error.stack}
                </div>
              )}
              {this.state.errorInfo?.componentStack && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#475569' }}>
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={this.handleReset}
                style={{
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
