import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const steps = [
  {
    id: 'welcome',
    content: (
      <div>
        <div style={{ width: '48px', height: '48px', background: '#EAF3DE', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#588157" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#2F3E46', marginBottom: '12px' }}>Welcome to CUB.</h2>
        <p style={{ fontSize: '13px', color: '#2F3E46', lineHeight: '1.7', marginBottom: '12px' }}>I built this because I got tired of patients having my personal number. As a solo practitioner, I wanted boundaries without barriers — a way to stay professional at work, and actually off when I'm off.</p>
        <p style={{ fontSize: '13px', color: '#2F3E46', lineHeight: '1.7', marginBottom: '12px' }}>CUB gives you a dedicated clinic line without the second phone, the second bill, or the second life — private, encrypted, and built for BC practitioners.</p>
        <p style={{ fontSize: '13px', color: '#2F3E46', lineHeight: '1.7', marginBottom: '16px' }}>This guide will get you set up in minutes.</p>
        <p style={{ fontSize: '12px', color: '#588157', fontWeight: '500' }}>— Jamie, Founder of CUB</p>
      </div>
    )
  },
  {
    id: 'profile',
    content: (
      <div>
        <div style={{ width: '48px', height: '48px', background: '#EAF3DE', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#588157" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#2F3E46', marginBottom: '12px' }}>Your Profile</h2>
        <p style={{ fontSize: '13px', color: '#2F3E46', lineHeight: '1.7', marginBottom: '16px' }}>Your name and clinic name appear in every message you send so patients always know who's reaching out.</p>

        {/* Hamburger UI preview */}
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Your header will look like this
          </span>
        </div>
        <div style={{
          background: '#fff', borderRadius: '10px',
          padding: '10px 14px', border: '0.5px solid #E2E8E1',
          marginBottom: '16px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#9CAF88' }} />
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#2F3E46' }}>Your Name · RMT</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ width: '14px', height: '1.5px', background: '#588157', borderRadius: '2px' }} />
            <div style={{ width: '14px', height: '1.5px', background: '#588157', borderRadius: '2px' }} />
            <div style={{ width: '14px', height: '1.5px', background: '#588157', borderRadius: '2px' }} />
          </div>
        </div>
        <div style={{ background: '#F8F9F7', borderRadius: '12px', padding: '14px 16px', border: '0.5px solid #E2E8E1' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#588157', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Need to make changes?</p>
          <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>Tap the <strong style={{ color: '#2F3E46' }}>menu (≡)</strong> anytime and go to <strong style={{ color: '#2F3E46' }}>Settings</strong> to update your details.</p>
        </div>
      </div>
    )
  },
  {
    id: 'clinicnumber',
    content: (
      <div>
        <div style={{ width: '48px', height: '48px', background: '#EAF3DE', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#588157" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#2F3E46', marginBottom: '12px' }}>Your Clinic Number</h2>
        <p style={{ fontSize: '13px', color: '#2F3E46', lineHeight: '1.7', marginBottom: '16px' }}>This is the number your patients will text and call. It shows at the top of your inbox — and on every patient's caller ID when you reach out.</p>

        {/* UI preview */}
        <div style={{ background: '#fff', borderRadius: '10px', padding: '10px 14px', border: '0.5px solid #E2E8E1', marginBottom: '16px' }}>
          <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0, letterSpacing: '0.05em' }}>
            Your active line: +1 778 555 1234
          </p>
        </div>

        <div style={{ background: '#F0F4EE', borderRadius: '12px', padding: '14px 16px', border: '0.5px solid #9CAF88', marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#588157', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Save it in your personal phone</p>
          <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>Add your clinic number to your personal contacts with a name you'll recognize instantly — something like <strong style={{ color: '#2F3E46' }}>"CUB Clinic Line"</strong> or <strong style={{ color: '#2F3E46' }}>"Westside Wellness Line"</strong>. This way you'll always know when a patient is calling back on your clinic line.</p>
        </div>

        <div style={{ background: '#F8F9F7', borderRadius: '12px', padding: '14px 16px', border: '0.5px solid #E2E8E1' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#588157', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>First impressions matter</p>
          <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>When you text a patient for the first time, use the <strong style={{ color: '#2F3E46' }}>Intro</strong> quick action to introduce yourself and your clinic line. Patients who know it's coming are far more likely to save your number — and recognize you as the professional you are.</p>
        </div>
      </div>
    )
  },
  {
    id: 'limitations',
    content: (
      <div>
        <div style={{ width: '48px', height: '48px', background: '#FFF8F0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0845C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#2F3E46', marginBottom: '12px' }}>Important Limitations</h2>
        <p style={{ fontSize: '13px', color: '#2F3E46', lineHeight: '1.7', marginBottom: '16px' }}>Your CUB clinic number is a VoIP number — it works beautifully for professional communication, but there are a few things to be aware of.</p>
        <div style={{ background: '#FFF8F0', borderRadius: '12px', padding: '14px 16px', border: '0.5px solid #D6BD98', marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#A0845C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>🚨 Never use for emergencies</p>
          <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>Your CUB number is not intended for 911 or emergency calls. Attempting to call 911 through your clinic number may result in a $100 USD fee. Always use a traditional phone line for emergencies.</p>
        </div>
        <div style={{ background: '#F8F9F7', borderRadius: '12px', padding: '14px 16px', border: '0.5px solid #E2E8E1', marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#588157', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Two-factor authentication</p>
          <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>Your CUB number may not be accepted for SMS-based two-factor authentication such as banks or government services.</p>
        </div>
      </div>
    )
  },
  {
    id: 'patients',
    content: (
      <div>
        <div style={{ width: '48px', height: '48px', background: '#EAF3DE', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#588157" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#2F3E46', marginBottom: '12px' }}>Adding Patients</h2>
        <p style={{ fontSize: '13px', color: '#2F3E46', lineHeight: '1.7', marginBottom: '16px' }}>Tap the <strong>+</strong> button to start a conversation with any patient number. You can save their name by tapping their name in the conversation header.</p>

        {/* + button UI preview */}
        <div style={{
          background: '#fff', borderRadius: '10px',
          padding: '10px 14px', border: '0.5px solid #E2E8E1',
          marginBottom: '16px', display: 'flex',
          alignItems: 'center', gap: '10px'
        }}>
          <div style={{
            width: '28px', height: '28px', background: '#588157',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0
          }}>
            <span style={{ color: 'white', fontSize: '18px', lineHeight: 1 }}>+</span>
          </div>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>Start a new conversation</span>
        </div>

        <div style={{ background: '#F8F9F7', borderRadius: '12px', padding: '14px 16px', border: '0.5px solid #E2E8E1' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#588157', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Tip</p>
          <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>To call a patient, open their conversation and tap the phone icon in the top right of the chat.</p>
        </div>
      </div>
    )
  },
  {
    id: 'messaging',
    content: (
      <div>
        <div style={{ width: '48px', height: '48px', background: '#EAF3DE', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#588157" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#2F3E46', marginBottom: '12px' }}>Sending Messages</h2>
        <p style={{ fontSize: '13px', color: '#2F3E46', lineHeight: '1.7', marginBottom: '16px' }}>Type in the message box and tap send. Use the quick action chips for common messages — one tap fills the message for you.</p>
        <div style={{ background: '#F8F9F7', borderRadius: '12px', padding: '14px 16px', border: '0.5px solid #E2E8E1' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#588157', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Quick actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Intro', desc: 'Introduce your clinic number to a patient for the first time' },
              { label: 'Pre-call', desc: "Let patients know you're about to call from this number" },
              { label: 'Late?', desc: 'Check if your patient is on their way' },
              { label: 'Cancellation', desc: 'Offer a last-minute opening to a patient' }
            ].map(a => (
              <div key={a.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ padding: '3px 8px', background: '#EAF3DE', borderRadius: '20px', fontSize: '10px', color: '#588157', fontWeight: '500', flexShrink: 0 }}>{a.label}</div>
                <span style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.5' }}>{a.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'calls',
    content: (
      <div>
        <div style={{ width: '48px', height: '48px', background: '#EAF3DE', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#588157" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#2F3E46', marginBottom: '12px' }}>Making Calls</h2>
        <p style={{ fontSize: '13px', color: '#2F3E46', lineHeight: '1.7', marginBottom: '16px' }}>Tap the phone icon in a conversation to open the voice bridge. CUB calls your personal phone first — answer it and your patient's phone rings. Your clinic number appears on their caller ID.</p>
        <div style={{ background: '#F8F9F7', borderRadius: '12px', padding: '14px 16px', border: '0.5px solid #E2E8E1', marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#588157', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Use the Pre-call text first</p>
          <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>Sending a quick pre-call text before you dial gives patients a heads up that an unfamiliar number is about to call. It dramatically increases the chance they'll pick up — especially the first time.</p>
        </div>
        <div style={{ background: '#F8F9F7', borderRadius: '12px', padding: '14px 16px', border: '0.5px solid #E2E8E1' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#588157', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Missed calls</p>
          <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>If a patient calls your clinic number and you miss it, they'll automatically be prompted to send you a text instead.</p>
        </div>
      </div>
    )
  },
  {
    id: 'status',
    content: (
      <div>
        <div style={{ width: '48px', height: '48px', background: '#EAF3DE', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#588157" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#2F3E46', marginBottom: '12px' }}>Your Status</h2>
        <p style={{ fontSize: '13px', color: '#2F3E46', lineHeight: '1.7', marginBottom: '16px' }}>Set your status from the menu in the top right. Your status is just for you — patients never see it.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {[
            { color: '#9CAF88', label: 'Active', desc: "You're available and accepting messages normally" },
            { color: '#D6BD98', label: 'In Session', desc: "You're with a patient — a helpful reminder to check messages after" },
            { color: '#64748B', label: 'Off Duty', desc: "You're off the clock — messages are saved for when you're back" }
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F8F9F7', borderRadius: '12px', padding: '12px 16px', border: '0.5px solid #E2E8E1' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#2F3E46' }}>{s.label}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: '#F0F4EE', borderRadius: '12px', padding: '14px 16px', border: '0.5px solid #9CAF88' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#588157', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Auto-reply when Off Duty</p>
          <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>Set up an auto-reply message in <strong style={{ color: '#2F3E46' }}>Settings</strong> so patients automatically receive a warm response when you're Off Duty. You write the message — CUB sends it.</p>
        </div>
      </div>
    )
  },
  {
    id: 'ready',
    content: (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ width: '64px', height: '64px', background: '#EAF3DE', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#588157" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#2F3E46', marginBottom: '12px' }}>You're all set.</h2>
        <p style={{ fontSize: '13px', color: '#2F3E46', lineHeight: '1.7', marginBottom: '20px' }}>Your clinic line is live. Start by introducing it to your first patient — everything else will follow naturally.</p>
        <div style={{ background: '#F8F9F7', borderRadius: '12px', padding: '14px 16px', border: '0.5px solid #E2E8E1', textAlign: 'left', marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#588157', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>This guide lives in your menu</p>
          <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>Access it anytime from <strong style={{ color: '#2F3E46' }}>Help & FAQ</strong> in the top right menu.</p>
        </div>
        <div style={{ background: '#F8F9F7', borderRadius: '12px', padding: '14px 16px', border: '0.5px solid #E2E8E1', textAlign: 'left' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#588157', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>We read every message</p>
          <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>Have feedback or a question? The CUB team reads every message sent through the feedback prompts. We're building this — not just for you — but with you.</p>
        </div>
      </div>
    )
  }
];

function OnboardingTour({ onComplete, userEmail }) {
  const [step, setStep] = useState(0);

  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const handleComplete = async () => {
    try {
      await supabase.from('practitioners')
        .update({ tour_completed: true })
        .eq('user_email', userEmail);
    } catch (err) {
      console.error('Tour complete error:', err);
    }
    onComplete();
  };

  const isMobile = window.innerWidth < 768;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(47, 62, 70, 0.4)', zIndex: 400,
      fontFamily: "'Outfit', sans-serif",
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'stretch',
      justifyContent: isMobile ? 'center' : 'flex-end'
    }}>
      <div style={{
        width: isMobile ? '100%' : '380px',
        height: isMobile ? '70vh' : '100%',
        background: '#F7F6F2',
        borderRadius: isMobile ? '20px 20px 0 0' : '0',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: isMobile
          ? '0 -8px 32px rgba(0,0,0,0.15)'
          : '-8px 0 32px rgba(0,0,0,0.1)'
      }}>

        {/* Header */}
        <div style={{
          background: '#fff', padding: '12px 20px',
          borderBottom: '0.5px solid #E2E8E1', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <button onClick={handleComplete} style={{
              background: 'none', border: 'none', color: '#94A3B8',
              fontSize: '11px', fontWeight: '600', cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>Close</button>
            <span style={{ fontSize: '10px', color: '#94A3B8' }}>
              Step {step + 1} of {steps.length}
            </span>
            <div style={{ width: '40px' }} />
          </div>
          <div style={{ background: '#E2E8E1', borderRadius: '6px', height: '6px' }}>
            <div style={{
              background: '#588157', height: '6px', borderRadius: '6px',
              width: `${((step + 1) / steps.length) * 100}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
          {steps[step].content}
        </div>

        {/* Navigation */}
        <div style={{
          background: '#fff', padding: '12px 20px',
          borderTop: '0.5px solid #E2E8E1',
          display: 'flex', gap: '10px', flexShrink: 0
        }}>
          {!isFirst && (
            <button onClick={() => setStep(step - 1)} style={{
              flex: 1, height: '44px', background: '#fff',
              border: '0.5px solid #E2E8E1', borderRadius: '12px',
              fontSize: '11px', fontWeight: '600', color: '#588157',
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>Back</button>
          )}
          <button onClick={isLast ? handleComplete : () => setStep(step + 1)} style={{
            flex: 1, height: '44px', background: '#588157',
            border: 'none', borderRadius: '12px',
            fontSize: '11px', fontWeight: '600', color: 'white',
            cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.08em'
          }}>
            {isLast ? 'Get Started →' : 'Next →'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default OnboardingTour;