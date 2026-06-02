'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ChunkErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State | null {
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module');

    if (isChunkError) {
      return { hasError: true, error };
    }

    // Return null for non-chunk errors so they propagate normally
    return null;
  }

  componentDidCatch(error: Error) {
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module');

    if (isChunkError && typeof window !== 'undefined') {
      // Auto-reload once on chunk error (stale deploy cache)
      const key = 'chunk_error_reload';
      const lastReload = sessionStorage.getItem(key);
      if (!lastReload) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return;
      }
    }

    console.error('ChunkErrorBoundary caught:', error);
  }

  handleReload = () => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('chunk_error_reload');
    // Add cache-busting param to force fresh load
    const url = new URL(window.location.href);
    url.searchParams.set('_r', '1');
    window.location.replace(url.toString());
  };

  render() {
    if (this.state.hasError) {
      // Use inline styles only — Tailwind/UI chunks may also be broken
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            padding: 16,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 400,
              width: '100%',
              backgroundColor: '#fff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              padding: 32,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                backgroundColor: '#fff7ed',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 32,
              }}
            >
              ⚠️
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              Atualização Disponível
            </h2>
            <p style={{ fontSize: 14, color: '#475569', marginBottom: 24, lineHeight: 1.6 }}>
              Uma nova versão da aplicação foi publicada. Clique no botão abaixo para carregar a
              versão mais recente.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔄 Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
