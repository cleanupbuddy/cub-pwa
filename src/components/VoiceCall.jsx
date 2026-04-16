import React, { useState, useEffect } from 'react';

import { VERCEL_URL } from '../lib/config';

function VoiceCall({ contact, clinicNumber, practitionerNumber, therapistName, clinicName, onClose }) {
  const [status, setStatus] = useState('idle');
  const [notifySent, setNotifySent] = useState(false);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (notifySent) {
      setCountdown(15);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [notifySent]);

  const sendPreCallText = async () => {
    try {
      await fetch(`${VERCEL_URL}/api/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: contact.phone,
          from: clinicNumber,
          message: `Hi, this is ${therapistName} from ${clinicName}. I will be calling you from this number in a moment.`
        })
      });
      setNotifySent(true);
    } catch (err) {
      console.error('Pre-call text error:', err);
    }
  };

  const makeCall = async () => {
    if (!practitionerNumber) {
      setStatus('error');
      return;
    }
    setStatus('calling');
    try {
      const response = await fetch(`${VERCEL_URL}/api/make-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practitionerPhone: practitionerNumber,
          patientPhone: contact.phone,
          clinicNumber: clinicNumber
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setStatus('connected');
      setTimeout(() => onClose(), 4000);
    } catch (err) {
      console.error('Call error:', err);
      setStatus('error');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(47, 62, 70, 0.85)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif", padding: '24px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '32px 24px',
        width: '100%', maxWidth: '360px', textAlign: 'center'
      }}>
        {/* Avatar */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: '#CAD2C5', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
          fontSize: '20px', fontWeight: '500', color: '#588157'
        }}>
          {contact.name ? contact.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '#'}
        </div>

        {/* Name */}
        <div style={{ fontSize: '18px', fontWeight: '500', color: '#2F3E46', marginBottom: '4px' }}>
          {contact.name || contact.phone}
        </div>
        <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '24px' }}>
          {contact.phone}
        </div>

        {/* Calling status */}
        {status === 'calling' && (
          <div style={{
            background: '#F0F4EE', borderRadius: '10px', padding: '16px',
            fontSize: '12px', color: '#588157', marginBottom: '20px',
            textAlign: 'center'
          }}>
            📞 Your phone will ring first, then your patient will be connected.
          </div>
        )}

        {/* Connected status */}
        {status === 'connected' && (
          <div style={{
            background: '#F0F4EE', borderRadius: '10px', padding: '10px 16px',
            fontSize: '12px', color: '#588157', marginBottom: '20px'
          }}>
            📞 Your phone should be ringing now!
          </div>
        )}

        {/* Error status */}
        {status === 'error' && (
          <div style={{
            background: '#FFF0F0', borderRadius: '10px', padding: '10px 16px',
            fontSize: '12px', color: '#E57373', marginBottom: '20px'
          }}>
            ⚠️ Call failed. Make sure your personal mobile is set in Settings.
          </div>
        )}

        {/* Pre-call text sent with countdown */}
        {notifySent && (
          <div style={{
            background: '#F0F4EE', borderRadius: '10px', padding: '16px',
            fontSize: '12px', color: '#588157', marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div>✓ Pre-call text sent!</div>
            {countdown > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '10px', color: '#9CAF88', marginBottom: '4px' }}>
                  Suggested wait before calling
                </div>
                <div style={{
                  fontSize: '28px', fontWeight: '700', color: '#588157',
                  fontFamily: "'Outfit', sans-serif", lineHeight: 1
                }}>
                  {countdown}s
                </div>
              </div>
            )}
            {countdown === 0 && (
              <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: '600' }}>
                Ready to call! 📞
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '24px', lineHeight: '1.6' }}>
          Your personal phone rings first. Your clinic number appears on their caller ID.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <button
            onClick={sendPreCallText}
            disabled={notifySent}
            style={{
              flex: 1, padding: '12px', background: '#EAF3DE',
              border: '0.5px solid #9CAF88', borderRadius: '12px',
              fontSize: '11px', fontWeight: '600', color: '#588157',
              cursor: notifySent ? 'not-allowed' : 'pointer',
              fontFamily: "'Outfit', sans-serif", opacity: notifySent ? 0.6 : 1
            }}
          >
            Pre-call Text
          </button>
          <button
            onClick={makeCall}
            disabled={status === 'calling'}
            style={{
              flex: 1, padding: '12px', background: '#588157',
              border: 'none', borderRadius: '12px',
              fontSize: '11px', fontWeight: '600', color: 'white',
              cursor: status === 'calling' ? 'not-allowed' : 'pointer',
              fontFamily: "'Outfit', sans-serif"
            }}
          >
            {status === 'calling' ? 'Calling...' : 'Call Now'}
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: '#94A3B8',
            fontSize: '11px', cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif"
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default VoiceCall;