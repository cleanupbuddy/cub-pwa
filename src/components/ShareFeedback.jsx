import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

function ShareFeedback({ onClose, userEmail }) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('feedback').insert([{
          practitioner_id: session.user.id,
          user_email: session.user.email,
          day_prompt: 0,
          improvement_suggestion: message,
          created_at: new Date().toISOString()
        }]);
      }
      setSubmitted(true);
      setTimeout(() => onClose(), 2500);
    } catch (err) {
      console.error('Feedback error:', err);
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(47,62,70,0.85)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif", padding: '24px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '40px 24px',
        width: '100%', maxWidth: '400px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🌿</div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#2F3E46', marginBottom: '8px' }}>
          Thank you!
        </div>
        <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.6' }}>
          We read every message. Your feedback shapes what CUB becomes.
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(47,62,70,0.85)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif", padding: '24px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '32px 24px',
        width: '100%', maxWidth: '420px'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '10px', color: '#9CAF88', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
            Share Feedback
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#2F3E46', marginBottom: '8px' }}>
            What's on your mind?
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.6' }}>
            Suggestions, ideas, something you love — we read every message personally.
          </div>
        </div>

        <textarea
          placeholder="Tell us anything..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          autoFocus
          style={{
            width: '100%', height: '140px', padding: '14px',
            border: '0.5px solid #E2E8E1', borderRadius: '12px',
            fontSize: '13px', color: '#2F3E46', resize: 'none',
            fontFamily: "'Outfit', sans-serif", outline: 'none',
            boxSizing: 'border-box', marginBottom: '16px', lineHeight: '1.7'
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={!message.trim() || submitting}
          style={{
            width: '100%', padding: '12px',
            background: message.trim() ? '#588157' : '#E2E8E1',
            border: 'none', borderRadius: '12px', fontSize: '11px',
            fontWeight: '600', color: message.trim() ? 'white' : '#94A3B8',
            cursor: !message.trim() || submitting ? 'not-allowed' : 'pointer',
            fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: '10px'
          }}
        >
          {submitting ? 'Sending...' : 'Send Feedback →'}
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%', background: 'none', border: 'none',
            color: '#C5CAD2', fontSize: '11px', cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif"
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ShareFeedback;