import React, { useState, useEffect } from 'react';

import { VERCEL_URL } from '../lib/config';

import { supabase } from '../lib/supabase';

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

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        await supabase.from('messages').insert([{
          body: '📞 Outgoing call',
          direction: 'system',
          to_number: contact.phone,
          from_number: clinicNumber,
          practitioner_id: session.user.id
        }]);
      }

      setTimeout(() => onClose(), 4000);

    } catch (err) {
      console.error('Call error:', err);
      setStatus('error');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(47, 62, 70, 0.72)',
      backdropFilter: 'blur(4px)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif", padding: '24px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '24px',
        padding: '26px 20px',
        width: '100%',
        maxWidth: '360px',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.18)'
      }}>
        {/* Avatar */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#EAF3DE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: '20px',
          fontWeight: '600',
          color: '#588157',
          border: '1px solid #DCE8D4',
          boxShadow: '0 4px 12px rgba(88, 129, 87, 0.15)'
        }}>
          {contact.name ? contact.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '#'}
        </div>

        {/* Name */}
        <div style={{ fontSize: '19px', fontWeight: '600', color: '#2F3E46', marginBottom: '4px' }}>
          {contact.name || contact.phone}
        </div>
        <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '20px' }}>
          {contact.phone}
        </div>

        {/* Calling status */}
        {status === 'calling' && (
          <div style={{
            background: '#F8FAF7',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '12px',
            color: '#588157',
            marginBottom: '16px',
            textAlign: 'center',
            lineHeight: '1.5',
            border: '0.5px solid #DCE8D4'
          }}>
            📞 Calling your phone first...
          </div>
        )}

        {/* Connected status */}
        {status === 'connected' && (
          <div style={{
            background: '#F8FAF7',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '12px',
            color: '#588157',
            marginBottom: '16px',
            textAlign: 'center',
            lineHeight: '1.5',
            border: '0.5px solid #DCE8D4'
          }}>
            📞 Your phone is ringing now.
          </div>
        )}

        {/* Error status */}
        {status === 'error' && (
          <div style={{
            background: '#FFF6F6',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '12px',
            color: '#E57373',
            marginBottom: '16px',
            textAlign: 'center',
            lineHeight: '1.5',
            border: '0.5px solid #F3D1D1'
          }}>
            ⚠️ Call failed. Make sure your personal mobile is saved in Settings.
          </div>
        )}

        {/* Pre-call text sent with countdown */}
        {notifySent && (
          <div style={{
            background: '#F8FAF7',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '12px',
            color: '#588157',
            marginBottom: '16px',
            textAlign: 'center',
            border: '0.5px solid #DCE8D4'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              ✓ Pre-call text sent
            </div>

            <div style={{
              fontSize: '10px',
              color: '#94A3B8',
              lineHeight: '1.5'
            }}>
              Give it a few seconds so the text arrives before you call.
            </div>

            {countdown > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#588157',
                  fontFamily: "'Outfit', sans-serif",
                  lineHeight: 1,
                  transition: 'all 0.2s ease'
                }}>
                  {countdown}s
                </div>
                <div style={{
                  marginTop: '4px',
                  fontSize: '10px',
                  color: '#9CAF88'
                }}>
                  suggested wait
                </div>
              </div>
            )}

            {countdown === 0 && (
              <div style={{
                marginTop: '10px',
                fontSize: '11px',
                fontWeight: '600',
                color: '#588157'
              }}>
                Ready to call 📞
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <p style={{
          fontSize: '11px',
          color: '#94A3B8',
          marginBottom: '20px',
          lineHeight: '1.6'
        }}>
          Your phone rings first. Your clinic number appears on their caller ID.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button
            onClick={sendPreCallText}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            disabled={notifySent}
            style={{
              flex: 1,
              padding: '12px',
              background: '#F8FAF7',
              border: '0.5px solid #DCE8D4',
              borderRadius: '14px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#588157',
              cursor: notifySent ? 'not-allowed' : 'pointer',
              fontFamily: "'Outfit', sans-serif",
              opacity: notifySent ? 0.6 : 1,
              transform: 'scale(1)',
            }}
          >
            Pre-call Text
          </button>
          <button
            onClick={makeCall}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            disabled={status === 'calling' || (notifySent && countdown > 0)}
            style={{
              flex: 1,
              padding: '12px',
              background: status === 'calling' || (notifySent && countdown > 0) ? '#A8B89F' : '#588157',
              border: 'none',
              borderRadius: '14px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'white',
              cursor: status === 'calling' || (notifySent && countdown > 0) ? 'not-allowed' : 'pointer',
              fontFamily: "'Outfit', sans-serif",
              transition: 'background 0.2s ease',
              transform: 'scale(1)',
            }}
          >
            {status === 'calling'
              ? 'Calling...'
              : notifySent && countdown > 0
                ? `Wait ${countdown}s`
                : 'Call Now'}
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#A0A7B4',
            fontSize: '11px',
            cursor: 'pointer',
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