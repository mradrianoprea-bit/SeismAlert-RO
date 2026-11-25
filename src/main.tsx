import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected runtime error',
    };
  }

  componentDidCatch(error: Error): void {
    console.error('[SeismAlert] UI error boundary caught:', error);
  }

  handleResetAndReload = () => {
    try {
      localStorage.removeItem('seismalert_cached_events');
      localStorage.removeItem('seismalert_push_prefs');
    } catch {
      // ignore
    }
    if (typeof caches !== 'undefined') {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {})
        .finally(() => window.location.reload());
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const isEn =
        typeof window !== 'undefined' &&
        localStorage.getItem('seismalert_lang') === 'en';
      return (
        <div className="min-h-screen bg-[#070B12] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-slate-800 bg-[#0B111C] p-6 space-y-4">
            <h1 className="text-lg font-display font-bold text-white">
              {isEn ? 'SeismAlert — Recovery Mode' : 'SeismAlert — Mod Recuperare'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {isEn
                ? 'A cached state error interrupted rendering. Clear the local cache and reload to restore live seismic monitoring.'
                : 'O eroare de cache local a întrerupt afișarea. Curăță cache-ul local și reîncarcă pentru a relua monitorizarea seismică live.'}
            </p>
            <div className="rounded-lg border border-slate-800 bg-[#070B12] px-3 py-2 text-xs font-mono text-red-300 break-words">
              {this.state.errorMessage}
            </div>
            <button
              type="button"
              onClick={this.handleResetAndReload}
              className="w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition-colors"
            >
              {isEn ? 'Clear Cache & Reload' : 'Curăță Cache & Reîncarcă'}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    registerSW({ immediate: true });
  } else {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const reg of regs) {
          const url =
            reg.active?.scriptURL ||
            reg.waiting?.scriptURL ||
            reg.installing?.scriptURL ||
            '';
          if (url.includes('dev-sw.js') || /\/sw\.js(\?|$)/.test(url)) {
            void reg.unregister();
          }
        }
      })
      .catch(() => {});
    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => {
          for (const key of keys) {
            if (key.includes('workbox') || key.includes('precache')) {
              void caches.delete(key);
            }
          }
        })
        .catch(() => {});
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
