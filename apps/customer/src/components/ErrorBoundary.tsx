import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - catches React render/lifecycle errors before they
 * crash the entire app into a white screen.
 * Without this, any unhandled JS error during render = blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}>⚠️</div>
            <h2 style={styles.title}>Kuch galat ho gaya</h2>
            <p style={styles.subtitle}>
              App mein ek error aayi hai. Apna data safe hai —
              <br />
              Page refresh karein aur dobara try karein.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error details (dev only)</summary>
                <pre style={styles.pre}>
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button onClick={this.handleReset} style={styles.button}>
              🔄 Page Refresh Karein
            </button>
            <p style={styles.support}>Baar baar aa rahi hai? Support se contact karein.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    padding: '24px',
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '48px 36px',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center',
    color: '#fff',
  },
  icon: { fontSize: '56px', marginBottom: '16px' },
  title: { fontSize: '22px', fontWeight: 700, margin: '0 0 12px', color: '#fff' },
  subtitle: { fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: '0 0 24px' },
  button: {
    background: 'linear-gradient(135deg, #e91e8c, #c2185b)',
    color: '#fff', border: 'none', borderRadius: '12px',
    padding: '14px 28px', fontSize: '15px', fontWeight: 600,
    cursor: 'pointer', width: '100%', transition: 'opacity 0.2s',
  },
  support: { fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '16px 0 0' },
  details: { marginBottom: '20px', textAlign: 'left' },
  summary: { cursor: 'pointer', color: 'rgba(255,180,0,0.8)', fontSize: '13px', marginBottom: '8px' },
  pre: {
    background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '12px',
    fontSize: '11px', color: '#f87171', overflow: 'auto', maxHeight: '200px',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  },
};
