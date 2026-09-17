import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { VERCEL_URL } from '../lib/config';
import { PROFESSIONS } from '../constants/professions';

function Onboarding({ onComplete, userEmail }) {
  const [step, setStep] = useState(1);
  const [therapistName, setTherapistName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [professionType, setProfessionType] = useState('');
  const [practitionerPhone, setPractitionerPhone] = useState('+1');
  const [areaCode, setAreaCode] = useState('778');
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [otherProfession, setOtherProfession] = useState('');
  const [otherProfessionAbbreviation, setOtherProfessionAbbreviation] = useState('');
  const [verificationStep, setVerificationStep] = useState('enter'); // 'enter' | 'code' | 'verified'
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    };
  }, []);

  const totalSteps = 3;

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '0.5px solid #E2E8E1',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#2F3E46',
    background: '#fff',
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '12px'
  };

  const labelStyle = {
    fontSize: '10px',
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    display: 'block',
    marginBottom: '6px'
  };

  const saveStep1 = async () => {
    if (!therapistName.trim() || !clinicName.trim() || !professionType) {
      setError('Please fill in all fields.');
      return;
    }

    if (
      professionType === 'OTHER' &&
      (!otherProfession.trim() || !otherProfessionAbbreviation.trim())
    ) {
      setError('Please enter your profession and abbreviation.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please sign in again.');
        return;
      }
      const finalProfessionType =
        professionType === 'OTHER' ? otherProfession.trim() : professionType;

      const finalProfessionAbbreviation =
        professionType === 'OTHER'
          ? otherProfessionAbbreviation.trim().toUpperCase()
          : professionType;

      const { error } = await supabase.from('practitioners').upsert({
        user_email: session.user.email,
        therapist_name: therapistName,
        clinic_name: clinicName,
        profession_type: finalProfessionType,
        profession_abbreviation: finalProfessionAbbreviation
      }, { onConflict: 'user_email' });

      if (error) throw error;
      setStep(2);
    } catch (err) {
      console.error('Step 1 save error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const sendVerificationCode = async () => {
    const cleaned = practitionerPhone.replace(/\D/g, '');
    const strippedLeading1 = cleaned.startsWith('1') ? cleaned.slice(1) : cleaned;
    if (strippedLeading1.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setError('');
    setSendingCode(true);
    try {
      const response = await fetch('https://cub-bridge-api.vercel.app/api/health-check?type=verify-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: practitionerPhone })
      });
      const data = await response.json();
      if (data.success) {
        setVerificationStep('code');
        setResendCooldown(60);
        if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
        resendIntervalRef.current = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) { clearInterval(resendIntervalRef.current); return 0; }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.error || 'Could not send verification code. Please try again.');
      }
    } catch (err) {
      console.error('Send code error:', err);
      setError('Could not send verification code. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const verifyAndSave = async () => {
    if (!/^\d{6}$/.test(verificationCode)) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setError('');
    setVerifyingCode(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please sign in again.');
        return;
      }
      const response = await fetch('https://cub-bridge-api.vercel.app/api/health-check?type=verify-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: practitionerPhone, code: verificationCode })
      });
      const data = await response.json();
      if (data.success && data.verified) {
        const cleaned = practitionerPhone.replace(/\D/g, '');
        const formatted = cleaned.startsWith('1') ? `+${cleaned}` : `+1${cleaned}`;
        const { error: updateError } = await supabase.from('practitioners').update({
          practitioner_phone: formatted
        }).eq('user_email', session.user.email);
        if (updateError) throw updateError;
        setStep(3);
      } else {
        setError(data.error || 'Incorrect code. Please try again.');
      }
    } catch (err) {
      console.error('Verify error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const searchNumbers = async () => {
    setSearching(true);
    setError('');
    try {
      const response = await fetch(`${VERCEL_URL}/api/search-numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaCode })
      });
      const data = await response.json();
      setAvailableNumbers(data.numbers || []);
      if (!data.numbers?.length) setError('No numbers found. Try a different area code.');
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const claimNumber = async () => {
    if (!selectedNumber) return;
    setClaiming(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please sign in again.');
        return;
      }
      const response = await fetch(`${VERCEL_URL}/api/claim-number`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedNumber,
          userEmail: session.user.email
        })
      });
      const data = await response.json();
      if (data.success) {
        await supabase.from('practitioners')
          .update({ clinic_number: selectedNumber })
          .eq('user_email', session.user.email);
        setStep(4);
      } else {
        setError(data.error || 'Could not claim that number. Please try another.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

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

      {/* Progress bar */}
      {step <= totalSteps && (
        <div style={{ width: '100%', maxWidth: '420px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Getting set up
            </span>
            <span style={{ fontSize: '10px', color: '#94A3B8' }}>
              {step} of {totalSteps}
            </span>
          </div>
          <div style={{ background: '#E2E8E1', borderRadius: '6px', height: '4px' }}>
            <div style={{
              background: '#588157', height: '4px', borderRadius: '6px',
              width: `${(step / totalSteps) * 100}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Step content */}
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Step 1 — Profile */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2F3E46', marginBottom: '6px' }}>
              Tell us about yourself
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px', lineHeight: '1.6' }}>
              This helps personalize your clinic line — your name and clinic name may appear in message templates you send to patients, like your intro message.
            </p>

            <label style={labelStyle}>Your name</label>
            <input
              type="text"
              value={therapistName}
              onChange={e => setTherapistName(e.target.value)}
              placeholder="Your full name"
              style={inputStyle}
            />

            <label style={labelStyle}>Clinic or practice name</label>
            <input
              type="text"
              value={clinicName}
              onChange={e => setClinicName(e.target.value)}
              placeholder="Your clinic or practice name"
              style={inputStyle}
            />

            <label style={labelStyle}>Profession type</label>
            <select
              value={professionType}
              onChange={e => setProfessionType(e.target.value)}
              style={{ ...inputStyle, appearance: 'auto' }}
            >
              <option value="">Select your profession...</option>

              {PROFESSIONS.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>

            {professionType === 'OTHER' && (
              <>
                <input
                  type="text"
                  placeholder="Please specify your profession"
                  value={otherProfession}
                  onChange={e => setOtherProfession(e.target.value)}
                  style={inputStyle}
                />

                <input
                  type="text"
                  placeholder="Abbreviation (e.g. ST)"
                  value={otherProfessionAbbreviation}
                  onChange={e => setOtherProfessionAbbreviation(e.target.value.toUpperCase())}
                  style={inputStyle}
                  maxLength={10}
                />
              </>
            )}

            {error && <p style={{ color: '#E57373', fontSize: '12px', marginBottom: '12px' }}>{error}</p>}

            <button
              onClick={saveStep1}
              disabled={saving}
              style={{
                width: '100%', padding: '14px', background: '#588157',
                border: 'none', borderRadius: '12px', fontSize: '12px',
                fontWeight: '600', color: 'white', cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
                letterSpacing: '0.08em', marginTop: '8px'
              }}
            >
              {saving ? 'Saving...' : 'Continue →'}
            </button>
          </div>
        )}

        {/* Step 2 — Personal mobile */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2F3E46', marginBottom: '6px' }}>
              Your personal mobile
            </h2>

            {verificationStep === 'enter' && (
              <>
                <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px', lineHeight: '1.6' }}>
                  When you call a patient through CUB, your phone rings first. Your personal number stays completely hidden — patients only ever see your clinic number.
                </p>

                <label style={labelStyle}>Personal mobile number</label>
                <input
                  type="tel"
                  value={practitionerPhone}
                  onChange={e => setPractitionerPhone(e.target.value)}
                  placeholder="+1 778 555 0123"
                  style={inputStyle}
                />

                <div style={{
                  background: '#F0F4EE', borderRadius: '10px', padding: '12px 14px',
                  marginBottom: '20px', fontSize: '12px', color: '#588157', lineHeight: '1.6'
                }}>
                  🔒 Your personal number is never shared with patients or stored outside your secure account.
                </div>

                {error && <p style={{ color: '#E57373', fontSize: '12px', marginBottom: '12px' }}>{error}</p>}

                <button
                  onClick={sendVerificationCode}
                  disabled={sendingCode}
                  style={{
                    width: '100%', padding: '14px', background: '#588157',
                    border: 'none', borderRadius: '12px', fontSize: '12px',
                    fontWeight: '600', color: 'white', cursor: sendingCode ? 'not-allowed' : 'pointer',
                    fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
                    letterSpacing: '0.08em', marginBottom: '10px'
                  }}
                >
                  {sendingCode ? 'Sending...' : 'Send verification code'}
                </button>

                <button
                  onClick={() => setStep(3)}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    color: '#C5CAD2', fontSize: '11px', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  Skip for now
                </button>
              </>
            )}

            {verificationStep === 'code' && (
              <>
                <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px', lineHeight: '1.6' }}>
                  We sent a 6-digit code to <strong style={{ color: '#2F3E46' }}>{practitionerPhone}</strong>. Enter it below to verify your number.
                </p>

                <label style={labelStyle}>Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  style={inputStyle}
                />

                {error && <p style={{ color: '#E57373', fontSize: '12px', marginBottom: '12px' }}>{error}</p>}

                <button
                  onClick={verifyAndSave}
                  disabled={verifyingCode}
                  style={{
                    width: '100%', padding: '14px', background: '#588157',
                    border: 'none', borderRadius: '12px', fontSize: '12px',
                    fontWeight: '600', color: 'white', cursor: verifyingCode ? 'not-allowed' : 'pointer',
                    fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
                    letterSpacing: '0.08em', marginBottom: '10px'
                  }}
                >
                  {verifyingCode ? 'Verifying...' : 'Verify'}
                </button>

                <button
                  onClick={sendVerificationCode}
                  disabled={resendCooldown > 0 || sendingCode}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    color: resendCooldown > 0 ? '#C5CAD2' : '#588157', fontSize: '11px',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    fontFamily: "'Outfit', sans-serif", marginBottom: '10px'
                  }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>

                <button
                  onClick={() => { setVerificationStep('enter'); setVerificationCode(''); setError(''); }}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    color: '#C5CAD2', fontSize: '11px', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  Change number
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 3 — Claim number */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2F3E46', marginBottom: '6px' }}>
              Choose your clinic number
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px', lineHeight: '1.6' }}>
              This is the number your patients will text and call. Pick a BC area code that feels right for your practice.
            </p>

            <label style={labelStyle}>Area code</label>
            <select
              value={areaCode}
              onChange={e => setAreaCode(e.target.value)}
              style={{ ...inputStyle, appearance: 'auto' }}
            >
              <option value="778">BC — 778</option>
              <option value="236">BC — 236</option>
              <option value="604">Vancouver — 604</option>
              <option value="250">BC Interior — 250</option>
            </select>

            <button
              onClick={searchNumbers}
              disabled={searching}
              style={{
                width: '100%', padding: '12px', background: '#EAF3DE',
                border: '0.5px solid #9CAF88', borderRadius: '12px',
                fontSize: '12px', fontWeight: '600', color: '#588157',
                cursor: searching ? 'not-allowed' : 'pointer',
                fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: '12px'
              }}
            >
              {searching ? 'Searching...' : 'Search Available Numbers'}
            </button>

            {availableNumbers.length > 0 && (
              <p style={{ fontSize: '10px', color: '#C5CAD2', textAlign: 'center', marginBottom: '8px', marginTop: '-4px' }}>
                Tap Search again to refresh the list
              </p>
            )}

            {availableNumbers.length > 0 && (
              <div>
                <label style={labelStyle}>Available numbers</label>
                <select
                  value={selectedNumber}
                  onChange={e => setSelectedNumber(e.target.value)}
                  style={{ ...inputStyle, appearance: 'auto' }}
                >
                  <option value="">Select a number...</option>
                  {availableNumbers.map(n => (
                    <option key={n.phoneNumber} value={n.phoneNumber}>
                      {n.friendlyName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && <p style={{ color: '#E57373', fontSize: '12px', marginBottom: '12px' }}>{error}</p>}

            {selectedNumber && (
              <button
                onClick={claimNumber}
                disabled={claiming}
                style={{
                  width: '100%', padding: '14px', background: '#588157',
                  border: 'none', borderRadius: '12px', fontSize: '12px',
                  fontWeight: '600', color: 'white', cursor: claiming ? 'not-allowed' : 'pointer',
                  fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
                  letterSpacing: '0.08em', marginBottom: '10px'
                }}
              >
                {claiming ? 'Claiming...' : 'Claim This Number →'}
              </button>
            )}
          </div>
        )}

        {/* Step 4 — Tour opt-in */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2F3E46', marginBottom: '6px' }}>
              You're all set!
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px', lineHeight: '1.6' }}>
              Your clinic number is ready to use. Want a quick walkthrough of CUB's features — quick reply chips, auto-reply, voice bridge, and more? Takes about 2 minutes.
            </p>

            <button
              onClick={() => onComplete(true)}
              style={{
                width: '100%', padding: '14px', background: '#588157',
                border: 'none', borderRadius: '12px', fontSize: '12px',
                fontWeight: '600', color: 'white', cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: '10px'
              }}
            >
              Take the quick tour
            </button>

            <button
              onClick={() => onComplete(false)}
              style={{
                width: '100%', padding: '14px', background: '#fff',
                border: '0.5px solid #E2E8E1', borderRadius: '12px', fontSize: '12px',
                fontWeight: '600', color: '#2F3E46', cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: '16px'
              }}
            >
              Skip, I'll explore on my own
            </button>

            <p style={{ fontSize: '11px', color: '#C5CAD2', textAlign: 'center' }}>
              You can always find the tour later in the menu under Help.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Onboarding;