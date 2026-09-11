import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const primaryButtonStyle = (disabled) => ({
  width: '100%', padding: '14px', background: '#588157',
  border: 'none', borderRadius: '12px', fontSize: '12px',
  fontWeight: '600', color: 'white', cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
  letterSpacing: '0.08em', marginBottom: '10px'
});

const secondaryButtonStyle = {
  width: '100%', padding: '14px', background: '#fff',
  border: '0.5px solid #E2E8E1', borderRadius: '12px', fontSize: '12px',
  fontWeight: '600', color: '#2F3E46', cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const linkButtonStyle = {
  width: '100%', background: 'none', border: 'none',
  color: '#C5CAD2', fontSize: '11px', cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif"
};

function BCGate({ userEmail, children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'question' | 'waitlist' | 'approved'
  const [submitting, setSubmitting] = useState(false);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistSaving, setWaitlistSaving] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('practitioners')
        .select('is_bc_practitioner')
        .eq('user_email', userEmail)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { error: insertError } = await supabase
          .from('practitioners')
          .insert([{ user_email: userEmail, is_bc_practitioner: null }]);
        if (insertError) throw insertError;
        setStatus('question');
        return;
      }

      if (data.is_bc_practitioner === true) {
        setStatus('approved');
      } else if (data.is_bc_practitioner === false) {
        setStatus('waitlist');
      } else {
        setStatus('question');
      }
    } catch (err) {
      console.error('BCGate status check error:', err);
      setStatus('question');
    }
  }, [userEmail]);

  useEffect(() => {
    if (userEmail) fetchStatus();
  }, [userEmail, fetchStatus]);

  const handleYes = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('practitioners')
        .update({ is_bc_practitioner: true })
        .eq('user_email', userEmail);
      if (error) throw error;
      await fetchStatus();
    } catch (err) {
      console.error('BCGate update error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNo = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('practitioners')
        .update({ is_bc_practitioner: false })
        .eq('user_email', userEmail);
      if (error) throw error;
      setWaitlistSubmitted(false);
      setStatus('waitlist');
    } catch (err) {
      console.error('BCGate update error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const joinWaitlist = async () => {
    setWaitlistSaving(true);
    try {
      if (userEmail) {
        await supabase.from('non_bc_waitlist').insert([{ email: userEmail }]);
      }
      setWaitlistSubmitted(true);
    } catch (err) {
      console.error('Waitlist join error:', err);
      setWaitlistSubmitted(true);
    } finally {
      setWaitlistSaving(false);
    }
  };

  const exitToHome = async () => {
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 3000))
      ]);
    } catch (err) {
      console.error('exitToHome error:', err);
    } finally {
      localStorage.removeItem('cub_last_contact');
      localStorage.removeItem('cub_profile_cache');
      window.location.href = 'https://getcubsuite.com';
    }
  };

  if (status === 'approved') {
    return children;
  }

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#F7F6F2',
        fontFamily: "'Outfit', sans-serif",
        color: '#588157',
        fontSize: '14px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F6F2',
      fontFamily: "'Outfit', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      boxSizing: 'border-box'
    }}>
      {/* Logo */}
      <svg width="56" height="56" viewBox="0 0 120 120" style={{ marginBottom: '24px' }}>
        <rect x="0" y="0" width="120" height="120" rx="22" fill="#EAF3DE" />
        <text x="60" y="95" fontFamily="Georgia, serif" fontSize="36" fontWeight="700" fill="#526659" textAnchor="middle" letterSpacing="-0.5">cub</text>
      </svg>

      <div style={{ width: '100%', maxWidth: '420px' }}>
        {status === 'question' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2F3E46', marginBottom: '6px' }}>
              Quick question before we get started
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px', lineHeight: '1.6' }}>
              CUB is currently only available to registered health practitioners in British Columbia.
            </p>
            <p style={{ fontSize: '13px', color: '#2F3E46', marginBottom: '20px', lineHeight: '1.6', fontWeight: '600' }}>
              Are you a registered health practitioner in BC?
            </p>

            <button
              onClick={handleYes}
              disabled={submitting}
              style={primaryButtonStyle(submitting)}
            >
              {submitting ? 'Saving...' : "Yes, I'm in BC"}
            </button>

            <button
              onClick={handleNo}
              disabled={submitting}
              style={secondaryButtonStyle}
            >
              No
            </button>
          </div>
        )}

        {status === 'waitlist' && !waitlistSubmitted && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2F3E46', marginBottom: '6px' }}>
              We're BC-only for now
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px', lineHeight: '1.6' }}>
              CUB is currently only available to registered health practitioners in British Columbia. Want to know when we expand to other provinces?
            </p>

            <button
              onClick={joinWaitlist}
              disabled={waitlistSaving}
              style={primaryButtonStyle(waitlistSaving)}
            >
              {waitlistSaving ? 'Saving...' : 'Notify me'}
            </button>

            <button onClick={exitToHome} style={linkButtonStyle}>
              Not now
            </button>
          </div>
        )}

        {status === 'waitlist' && waitlistSubmitted && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2F3E46', marginBottom: '6px' }}>
              You're on the list!
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px', lineHeight: '1.6' }}>
              We'll email you when CUB expands to your province.
            </p>

            <button onClick={exitToHome} style={primaryButtonStyle(false)}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BCGate;
