import React, { useState } from 'react';

import { VERCEL_URL } from '../lib/config';

function Paywall({ userEmail, onSkip, onReturnToLogin }) {
  const [loading, setLoading] = useState(null);

  const handleSubscribe = async (plan) => {
    setLoading(plan);
    try {
      const response = await fetch(`${VERCEL_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, plan })
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{
      height: '100vh',
      background: '#F7F6F2',
      fontFamily: "'Outfit', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box'
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '20px' }}>
        <svg width="72" height="72" viewBox="0 0 120 120">
          <rect x="0" y="0" width="120" height="120" rx="22" fill="#EAF3DE" />
          <text x="60" y="95" fontFamily="Georgia, serif" fontSize="36" fontWeight="700" fill="#526659" textAnchor="middle" letterSpacing="-0.5">cub</text>
        </svg>
      </div>

      {/* Title */}
      <h1 style={{ color: '#526659', fontWeight: '700', fontSize: '22px', marginBottom: '4px', letterSpacing: '-0.5px', textAlign: 'center' }}>
        Your private clinic line
      </h1>
      <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '32px', textAlign: 'center', lineHeight: '1.6' }}>
        Keep your personal number personal.
      </p>

      {/* Plans */}
      <div style={{ width: '100%', maxWidth: '360px' }}>

        {/* Founding 50 */}
        <div style={{
          background: '#F8FAF7', border: '1.5px solid #9CAF88',
          borderRadius: '14px', padding: '16px', marginBottom: '16px'
        }}>
          <div style={{
            display: 'inline-block', background: '#EAF3DE', color: '#588157',
            fontSize: '9px', fontWeight: '600', padding: '2px 8px',
            borderRadius: '20px', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: '8px'
          }}>
            Founding 50
          </div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#2F3E46', marginBottom: '2px' }}>
            Founding 50 Plan
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '12px' }}>
            <span style={{ color: '#588157', fontWeight: '600' }}>$14.99</span>/month — locked in for life
          </div>
          <button
            onClick={() => handleSubscribe('founding')}
            disabled={loading === 'founding'}
            style={{
              width: '100%', height: '40px', background: '#588157',
              border: 'none', borderRadius: '10px', fontSize: '11px',
              fontWeight: '600', color: 'white', cursor: loading === 'founding' ? 'not-allowed' : 'pointer',
              fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
              letterSpacing: '0.08em', opacity: loading === 'founding' ? 0.7 : 1
            }}
          >
            {loading === 'founding' ? 'Loading...' : 'Join — Founding 50'}
          </button>
        </div>

        {/* Standard */}
        <div style={{
          background: '#fff', border: '0.5px solid #E2E8E1',
          borderRadius: '14px', padding: '16px', marginBottom: '16px'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#2F3E46', marginBottom: '2px' }}>
            Standard Plan
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '12px' }}>
            <span style={{ color: '#2F3E46', fontWeight: '600' }}>$29.00</span>/month
          </div>
          <button
            onClick={() => handleSubscribe('standard')}
            disabled={loading === 'standard'}
            style={{
              width: '100%', height: '40px', background: '#fff',
              border: '0.5px solid #E2E8E1', borderRadius: '10px',
              fontSize: '11px', fontWeight: '600', color: '#588157',
              cursor: loading === 'standard' ? 'not-allowed' : 'pointer',
              fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
              letterSpacing: '0.08em', opacity: loading === 'standard' ? 0.7 : 1
            }}
          >
            {loading === 'standard' ? 'Loading...' : 'Join — Standard'}
          </button>
        </div>

        <p style={{ fontSize: '10px', color: '#94A3B8', textAlign: 'center', marginBottom: '16px' }}>
          Secure payment via Stripe. Your first 7 days are on us.
        </p>

        {/* Secondary actions */}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>

          {onSkip && (
            <button
              onClick={onSkip}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#C5CAD2',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                textAlign: 'center',
                marginBottom: onReturnToLogin ? '8px' : '0'
              }}
            >
              Skip for now — take a look around first
            </button>
          )}

          {onReturnToLogin && (
            <button
              onClick={onReturnToLogin}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                fontSize: '10px',
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                textAlign: 'center'
              }}
            >
              Already have an account? Return to login
            </button>
          )}

        </div>
      </div>
    </div>
  );
}

export default Paywall;