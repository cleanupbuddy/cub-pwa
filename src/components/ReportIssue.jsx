import React, { useState } from 'react';
import * as Sentry from '@sentry/react';
import { supabase } from '../lib/supabase';

function ReportIssue({ onClose, userEmail }) {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const issueTypes = [
    'Messages not sending or receiving',
    'Voice calling not working',
    'Notifications not arriving',
    'App loading slowly or freezing',
    'Something looks broken or wrong',
    'Other'
  ];

  const handleSubmit = async () => {
    if (!issueType) return;
    setSubmitting(true);
    try {
      // Send to Sentry
      Sentry.captureMessage(`User reported issue: ${issueType} — ${description}`, {
        level: 'error',
        tags: { type: 'user_reported' },
        user: { email: userEmail },
        extra: {
          issueType,
          description,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      });

      // Save to Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('issue_reports').insert([{
          practitioner_id: session.user.id,
          user_email: userEmail,
          issue_type: issueType,
          description: description,
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString()
        }]);
      }

      setSubmitted(true);
      setTimeout(() => onClose(), 2500);
    } catch (err) {
      console.error('Report error:', err);
      setSubmitting(false);
    }
  };

  const optionStyle = (selected) => ({
    width: '100%', padding: '11px 14px', marginBottom: '8px',
    border: selected ? '1.5px solid #588157' : '0.5px solid #E2E8E1',
    borderRadius: '10px', fontSize: '13px', color: '#2F3E46',
    background: selected ? '#F0F4EE' : '#fff',
    cursor: 'pointer', textAlign: 'left',
    fontFamily: "'Outfit', sans-serif",
    fontWeight: selected ? '500' : '400'
  });

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
          Thank you for letting us know.
        </div>
        <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.6' }}>
          Our team has been notified and will look into this right away.
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(47,62,70,0.85)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif", padding: '24px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '32px 24px',
        width: '100%', maxWidth: '420px'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '10px', color: '#9CAF88', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
            Report an Issue
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#2F3E46', lineHeight: '1.4' }}>
            What's going wrong?
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px', lineHeight: '1.6' }}>
            Our team is notified immediately. The more detail the better.
          </div>
        </div>

        {/* Issue type */}
        {issueTypes.map(type => (
          <button
            key={type}
            onClick={() => setIssueType(type)}
            style={optionStyle(issueType === type)}
          >
            {type}
          </button>
        ))}

        {/* Description */}
        <textarea
          placeholder="Tell us more about what happened... (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{
            width: '100%', height: '90px', padding: '12px 14px',
            border: '0.5px solid #E2E8E1', borderRadius: '10px',
            fontSize: '13px', color: '#2F3E46', resize: 'none',
            fontFamily: "'Outfit', sans-serif", outline: 'none',
            boxSizing: 'border-box', marginTop: '4px', marginBottom: '16px'
          }}
        />

        {/* Buttons */}
        <button
          onClick={handleSubmit}
          disabled={!issueType || submitting}
          style={{
            width: '100%', padding: '12px', background: issueType ? '#588157' : '#E2E8E1',
            border: 'none', borderRadius: '12px', fontSize: '11px',
            fontWeight: '600', color: issueType ? 'white' : '#94A3B8',
            cursor: !issueType || submitting ? 'not-allowed' : 'pointer',
            fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: '10px'
          }}
        >
          {submitting ? 'Sending...' : 'Send Report →'}
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

export default ReportIssue;