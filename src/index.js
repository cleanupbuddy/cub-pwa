import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Never send personal or patient data to Sentry
    if (event.request?.data) {
      delete event.request.data;
    }
    return event;
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#F7F6F2', fontFamily: "'Outfit', sans-serif",
        flexDirection: 'column', gap: '12px'
      }}>
        <svg width="48" height="48" viewBox="0 0 120 120">
          <rect x="0" y="0" width="120" height="120" rx="22" fill="#EAF3DE"/>
          <text x="60" y="95" fontFamily="Georgia, serif" fontSize="36" fontWeight="700" fill="#526659" textAnchor="middle" letterSpacing="-0.5">cub</text>
        </svg>
        <div style={{ fontSize: '14px', color: '#2F3E46', fontWeight: '500' }}>Something went wrong.</div>
        <div style={{ fontSize: '12px', color: '#94A3B8' }}>Our team has been notified. Please refresh and try again.</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '8px', padding: '10px 20px', background: '#588157',
            border: 'none', borderRadius: '10px', color: 'white',
            fontSize: '11px', fontWeight: '600', cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}
        >
          Refresh
        </button>
      </div>
    }>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service worker registered:', reg))
      .catch(err => console.log('Service worker error:', err));
  });
}

reportWebVitals();