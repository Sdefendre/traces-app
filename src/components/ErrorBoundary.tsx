'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, resetKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Pick<State, 'hasError' | 'error'> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 24,
            backgroundColor: 'rgba(0,0,0,0.4)',
            color: '#a1a1aa',
            textAlign: 'center',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: '#ef4444' }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 12, maxWidth: 300, opacity: 0.7 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </div>
          <button
            onClick={() =>
              this.setState((state) => ({
                hasError: false,
                error: null,
                resetKey: state.resetKey + 1,
              }))
            }
            style={{
              marginTop: 8,
              padding: '6px 16px',
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(255,255,255,0.06)',
              color: '#e4e4e7',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return <div key={this.state.resetKey} className="contents">{this.props.children}</div>;
  }
}
