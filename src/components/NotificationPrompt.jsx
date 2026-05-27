import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { registerPushNotifications } from '../lib/notifications';

function NotificationPrompt({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const saveToDb = async (fields) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('practitioners')
      .update(fields)
      .eq('id', session.user.id);
  };

  const handleEnable = async () => {
    setLoading(true);
    const result = await registerPushNotifications();
    if (result.ok) {
      await saveToDb({ notifications_enabled: true, notification_prompt_shown: true });
      onComplete();
    } else if (result.reason === 'denied') {
      await saveToDb({ notifications_enabled: false, notification_prompt_shown: true });
      setMessage('Notifications blocked. Go to your device Settings → Notifications to enable them.');
      setLoading(false);
      setTimeout(() => onComplete(), 3000);
    } else if (result.reason === 'unsupported') {
      await saveToDb({ notification_prompt_shown: true });
      setMessage("Push notifications aren't supported on this browser.");
      setLoading(false);
      setTimeout(() => onComplete(), 3000);
    } else {
      await saveToDb({ notification_prompt_shown: true });
      setMessage('Something went wrong. You can enable notifications later in Settings.');
      setLoading(false);
      setTimeout(() => onComplete(), 3000);
    }
  };

  const handleLater = async () => {
    await saveToDb({ notification_prompt_shown: true });
    onComplete();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: '#F7F6F2', zIndex: 300, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'Outfit', sans-serif"
    }}>
      <svg width="56" height="56" viewBox="0 0 120 120" style={{ marginBottom: '24px' }}>
        <rect x="0" y="0" width="120" height="120" rx="22" fill="#EAF3DE" />
        <text x="60" y="95" fontFamily="Georgia, serif" fontSize="36" fontWeight="700" fill="#526659" textAnchor="middle" letterSpacing="-0.5">cub</text>
      </svg>

      <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#2F3E46', marginBottom: '12px' }}>
          Don't miss a patient message.
        </h2>
        <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.7', marginBottom: '32px' }}>
          Enable notifications so CUB can alert you even when the app isn't open.
        </p>

        {message && (
          <p style={{
            fontSize: '12px', color: '#A0845C', lineHeight: '1.6', marginBottom: '20px',
            background: '#FFF8F0', border: '0.5px solid #D6BD98', borderRadius: '10px', padding: '12px 14px'
          }}>
            {message}
          </p>
        )}

        <button
          onClick={handleEnable}
          disabled={loading || !!message}
          style={{
            width: '100%', padding: '14px', background: loading || message ? '#9CAF88' : '#588157',
            border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
            color: 'white', cursor: loading || message ? 'not-allowed' : 'pointer',
            fontFamily: "'Outfit', sans-serif", marginBottom: '12px'
          }}
        >
          {loading ? 'Enabling...' : 'Enable Notifications'}
        </button>

        <button
          onClick={handleLater}
          disabled={loading}
          style={{
            width: '100%', background: 'none', border: 'none',
            color: '#C5CAD2', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'Outfit', sans-serif"
          }}
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}

export default NotificationPrompt;
