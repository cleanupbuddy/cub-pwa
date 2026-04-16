import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

import { VERCEL_URL } from '../lib/config';

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
    setError('');
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please sign in again.');
        return;
      }
      const { error } = await supabase.from('practitioners').upsert({
        user_email: session.user.email,
        therapist_name: therapistName,
        clinic_name: clinicName,
        profession_type: professionType === 'Other' && otherProfession
          ? `Other: ${otherProfession}`
          : professionType
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

  const saveStep2 = async () => {
    if (!practitionerPhone || practitionerPhone === '+1') {
      setError('Please enter your personal mobile number.');
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
      const cleaned = practitionerPhone.replace(/\D/g, '');
      const strippedLeading1 = cleaned.startsWith('1') ? cleaned.slice(1) : cleaned;
      if (strippedLeading1.length !== 10) {
        setError('Please enter a valid 10-digit phone number.');
        return;
      }
      const formatted = cleaned.startsWith('1') ? `+${cleaned}` : `+1${cleaned}`;
      const { error } = await supabase.from('practitioners').update({
        practitioner_phone: formatted
      }).eq('user_email', session.user.email);
      if (error) throw error;
      setStep(3);
    } catch (err) {
      console.error('Step 2 save error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
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
        onComplete();
      } else {
        setError('Could not claim that number. Please try another.');
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

      {/* Step content */}
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Step 1 — Profile */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2F3E46', marginBottom: '6px' }}>
              Tell us about yourself
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px', lineHeight: '1.6' }}>
              This helps personalize your clinic line and messages to patients.
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
              <option value="Acupuncturist">Acupuncturist</option>
              <option value="Midwife">Midwife</option>
              <option value="Naturopath">Naturopathic Doctor (ND)</option>
              <option value="Nurse Practitioner">Nurse Practitioner</option>
              <option value="Occupational Therapist">Occupational Therapist</option>
              <option value="Physiotherapist">Physiotherapist</option>
              <option value="Psychologist">Psychologist</option>
              <option value="RCC">Registered Clinical Counsellor (RCC)</option>
              <option value="RMT">Registered Massage Therapist (RMT)</option>
              <option value="Social Worker">Social Worker</option>
              <option value="Other">Other Healthcare Professional</option>
            </select>

            {professionType === 'Other' && (
              <input
                type="text"
                placeholder="Please specify your profession"
                value={otherProfession}
                onChange={e => setOtherProfession(e.target.value)}
                style={inputStyle}
              />
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
              onClick={saveStep2}
              disabled={saving}
              style={{
                width: '100%', padding: '14px', background: '#588157',
                border: 'none', borderRadius: '12px', fontSize: '12px',
                fontWeight: '600', color: 'white', cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: '10px'
              }}
            >
              {saving ? 'Saving...' : 'Continue →'}
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
      </div>
    </div>
  );
}

export default Onboarding;