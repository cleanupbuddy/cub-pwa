import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ExportMessages from '../components/ExportMessages';
import { registerPushNotifications } from '../lib/notifications';

import { VERCEL_URL } from '../lib/config';

function Settings({ onBack, profile, onProfileUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [therapistName, setTherapistName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [practitionerNumber, setPractitionerNumber] = useState('+1');
  const [professionType, setProfessionType] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [autoReplyMsg, setAutoReplyMsg] = useState('');
  const [enableAutoReply, setEnableAutoReply] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [areaCode, setAreaCode] = useState('778');
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [daysOff, setDaysOff] = useState([]);
  const [inSessionMsg, setInSessionMsg] = useState('');
  const [enableInSessionAuto, setEnableInSessionAuto] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [otherProfession, setOtherProfession] = useState('');

  useEffect(() => {
    if (profile) {
      setTherapistName(profile.therapist_name || '');
      setClinicName(profile.clinic_name || '');
      setPractitionerNumber(profile.practitioner_phone || '+1');
      if (profile.profession_type?.startsWith('Other: ')) {
        setProfessionType('Other');
        setOtherProfession(profile.profession_type.replace('Other: ', ''));
      } else {
        setProfessionType(profile.profession_type || '');
      }
      setRegistrationNumber(profile.registration_number || '');
      setAutoReplyMsg(profile.auto_reply_msg || '');
      setEnableAutoReply(profile.enable_auto || false);
      setDaysOff(profile.days_off || []);
      setInSessionMsg(profile.in_session_msg || '');
      setEnableInSessionAuto(profile.enable_in_session_auto || false);
    }
  }, [profile]);

  const searchNumbers = async () => {
    setSearching(true);
    try {
      const response = await fetch(`${VERCEL_URL}/api/search-numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaCode })
      });
      const data = await response.json();
      setAvailableNumbers(data.numbers || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const claimNumber = async () => {
    if (!selectedNumber) return;
    setClaiming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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
        if (onProfileUpdate) onProfileUpdate();
        setAvailableNumbers([]);
        setSelectedNumber('');
      }
    } catch (err) {
      console.error('Claim error:', err);
    } finally {
      setClaiming(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const cleanedPhone = practitionerNumber.replace(/\D/g, '');
      const strippedLeading1 = cleanedPhone.startsWith('1') ? cleanedPhone.slice(1) : cleanedPhone;
      if (strippedLeading1.length !== 10) {
        setSaving(false);
        return;
      }
      const formattedPhone = cleanedPhone.startsWith('1') ? `+${cleanedPhone}` : `+1${cleanedPhone}`;

      await supabase.from('practitioners').update({
        therapist_name: therapistName,
        clinic_name: clinicName,
        practitioner_phone: formattedPhone,
        profession_type: professionType === 'Other' && otherProfession
          ? `Other: ${otherProfession}`
          : professionType,
        registration_number: registrationNumber,
        auto_reply_msg: autoReplyMsg,
        enable_auto: enableAutoReply,
        days_off: daysOff,
        in_session_msg: inSessionMsg,
        enable_in_session_auto: enableInSessionAuto,
      }).eq('user_email', session.user.email);

      setIsEditing(false);
      setSaved(true);
      setShowToast(true);
      setTimeout(() => {
        setSaved(false);
        setShowToast(false);
        setIsEditing(false);
        if (onProfileUpdate) onProfileUpdate();
      }, 2000);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const openBillingPortal = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${VERCEL_URL}/api/create-billing-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: session.user.email })
      });
      const data = await response.json();
      if (data.url) window.open(data.url, '_blank');
    } catch (err) {
      console.error('Billing portal error:', err);
    }
  };

  const inputStyle = (editable) => ({
    width: '100%',
    marginTop: '4px',
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    fontSize: '13px',
    backgroundColor: editable ? '#fff' : '#F1F5F9',
    color: editable ? '#2F3E46' : '#94A3B8',
    boxSizing: 'border-box',
    fontFamily: "'Outfit', sans-serif",
    cursor: editable ? 'text' : 'not-allowed',
    outline: 'none'
  });

  const labelStyle = {
    fontSize: '10px',
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'block',
    marginBottom: '4px'
  };

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      background: '#F7F6F2',
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '0.5px solid #E2E8E1',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: '#588157',
          fontSize: '11px', fontWeight: '600', cursor: 'pointer',
          fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
          letterSpacing: '0.08em'
        }}>‹ Back</button>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#2F3E46' }}>Settings</div>
        {isEditing ? (
          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              background: 'none', border: 'none', color: '#588157',
              fontSize: '11px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}
          >
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save'}
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              background: 'none', border: 'none', color: '#588157',
              fontSize: '11px', fontWeight: '600', cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}
          >
            Edit
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Profession */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Profession Type</label>
          <select
            value={professionType}
            onChange={e => setProfessionType(e.target.value)}
            disabled={!isEditing}
            style={{ ...inputStyle(isEditing), appearance: isEditing ? 'auto' : 'none' }}
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
              readOnly={!isEditing}
              style={inputStyle(isEditing)}
            />
          )}
        </div>

        {/* Registration number */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Registration Number</label>
          <input
            type="text"
            value={registrationNumber}
            onChange={e => setRegistrationNumber(e.target.value)}
            readOnly={!isEditing}
            placeholder="e.g. 12345"
            style={inputStyle(isEditing)}
          />
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#F1F5F9', margin: '20px 0' }} />

        {/* Therapist name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Therapist Name</label>
          <input
            type="text"
            value={therapistName}
            onChange={e => setTherapistName(e.target.value)}
            readOnly={!isEditing}
            placeholder="e.g. Jamie, RMT"
            style={inputStyle(isEditing)}
          />
        </div>

        {/* Clinic name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Clinic Name</label>
          <input
            type="text"
            value={clinicName}
            onChange={e => setClinicName(e.target.value)}
            readOnly={!isEditing}
            placeholder="e.g. Juniper Wellness"
            style={inputStyle(isEditing)}
          />
        </div>

        {/* Personal mobile */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Personal Mobile (for voice bridge)</label>
          <input
            type="text"
            value={practitionerNumber}
            onChange={e => setPractitionerNumber(e.target.value)}
            readOnly={!isEditing}
            placeholder="+1"
            style={inputStyle(isEditing)}
          />
        </div>

        {/* Clinic number */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>CUB Clinic Number</label>
          <input
            type="text"
            value={profile?.clinic_number || ''}
            readOnly
            style={inputStyle(false)}
          />
          {!profile?.clinic_number && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select
                  value={areaCode}
                  onChange={e => setAreaCode(e.target.value)}
                  style={{ ...inputStyle(true), width: '140px', marginTop: 0 }}
                >
                  <option value="778">BC (778)</option>
                  <option value="236">BC (236)</option>
                  <option value="250">Interior (250)</option>
                  <option value="604">Vancouver (604)</option>
                </select>
                <button
                  onClick={searchNumbers}
                  disabled={searching}
                  style={{
                    flex: 1, background: '#9CAF88', color: 'white',
                    border: 'none', borderRadius: '12px', fontSize: '12px',
                    fontWeight: '600', cursor: searching ? 'not-allowed' : 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  {searching ? 'Searching...' : 'Search BC'}
                </button>
              </div>
              {availableNumbers.length > 0 && (
                <select
                  value={selectedNumber}
                  onChange={e => setSelectedNumber(e.target.value)}
                  style={{ ...inputStyle(true), marginTop: 0, marginBottom: '8px' }}
                >
                  <option value="">Select a number...</option>
                  {availableNumbers.map(n => (
                    <option key={n.phoneNumber} value={n.phoneNumber}>{n.friendlyName}</option>
                  ))}
                </select>
              )}
              {selectedNumber && (
                <button
                  onClick={claimNumber}
                  disabled={claiming}
                  style={{
                    width: '100%', background: '#588157', color: 'white',
                    border: 'none', borderRadius: '12px', padding: '10px',
                    fontSize: '12px', fontWeight: '600',
                    cursor: claiming ? 'not-allowed' : 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  {claiming ? 'Claiming...' : 'Claim This Number'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Days off */}
        <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
          <label style={labelStyle}>Days Off</label>
          <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '12px', lineHeight: '1.6' }}>
            CUB will automatically set you to Off Duty on these days.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
              <label key={i} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '12px', color: '#2F3E46',
                cursor: isEditing ? 'pointer' : 'not-allowed',
                padding: '8px 12px', background: '#F7F6F2',
                borderRadius: '10px', border: '0.5px solid #E2E8E1'
              }}>
                <input
                  type="checkbox"
                  checked={daysOff.includes(i)}
                  onChange={e => {
                    if (!isEditing) return;
                    if (e.target.checked) {
                      setDaysOff([...daysOff, i]);
                    } else {
                      setDaysOff(daysOff.filter(d => d !== i));
                    }
                  }}
                  disabled={!isEditing}
                  style={{ accentColor: '#588157' }}
                />
                {day}
              </label>
            ))}
          </div>
        </div>

        {/* In Session Auto Reply */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>In Session Auto-Reply</label>
          <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '12px', lineHeight: '1.6' }}>
            Automatically sent to patients when you're In Session.
          </p>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: '12px', cursor: isEditing ? 'pointer' : 'not-allowed'
          }}>
            <input
              type="checkbox"
              checked={enableInSessionAuto}
              onChange={e => setEnableInSessionAuto(e.target.checked)}
              disabled={!isEditing}
              style={{ width: '16px', height: '16px', accentColor: '#588157' }}
            />
            <span style={{ fontSize: '12px', color: '#2F3E46' }}>Enable auto-reply when In Session</span>
          </label>
          <textarea
            value={inSessionMsg}
            onChange={e => setInSessionMsg(e.target.value)}
            readOnly={!isEditing}
            placeholder="e.g. Hi! I'm with a patient right now. 
Feel free to book your next appointment online: [your booking link]"
            style={{
              ...inputStyle(isEditing),
              resize: 'none',
              height: '80px'
            }}
          />
          <p style={{ fontSize: '10px', color: '#9CAF88', marginTop: '6px', marginBottom: '0', lineHeight: '1.6' }}>
            💡 Tip: Include your booking link so patients can self-book while you're away.
          </p>
        </div>

        {/* Off Duty Auto Reply */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Off Duty Auto-Reply</label>
          <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '12px', lineHeight: '1.6' }}>
            Automatically sent to patients when you're Off Duty.
          </p>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: '12px', cursor: isEditing ? 'pointer' : 'not-allowed'
          }}>
            <input
              type="checkbox"
              checked={enableAutoReply}
              onChange={e => setEnableAutoReply(e.target.checked)}
              disabled={!isEditing}
              style={{ width: '16px', height: '16px', accentColor: '#588157' }}
            />
            <span style={{ fontSize: '12px', color: '#2F3E46' }}>Enable auto-reply when Off Duty</span>
          </label>
          <textarea
            value={autoReplyMsg}
            onChange={e => setAutoReplyMsg(e.target.value)}
            readOnly={!isEditing}
            placeholder="e.g. Hi! I'm currently off duty and will be back on Monday. 
You can book online anytime at [your booking link]"
            style={{
              ...inputStyle(isEditing),
              resize: 'none',
              height: '80px'
            }}
          />
          <p style={{ fontSize: '10px', color: '#9CAF88', marginTop: '6px', marginBottom: '0', lineHeight: '1.6' }}>
            💡 Tip: Include your booking link so patients can self-book while you're away.
          </p>
        </div>

        {/* Billing */}
        <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
          <label style={labelStyle}>Subscription</label>
          <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '12px', lineHeight: '1.6' }}>
            Manage your plan, update payment details or cancel anytime.
          </p>
          <button
            onClick={openBillingPortal}
            style={{
              width: '100%', padding: '12px', background: '#fff',
              border: '0.5px solid #E2E8E1', borderRadius: '12px',
              fontSize: '11px', fontWeight: '600', color: '#2F3E46',
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}
          >
            Manage Billing →
          </button>
        </div>

        {/* Notifications */}
        <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
          <label style={labelStyle}>Notifications</label>
          <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '12px', lineHeight: '1.6' }}>
            Enable push notifications to get alerted when patients message you.
          </p>

          <button
            onClick={async () => {
              const sub = await registerPushNotifications();
              console.log('Push subscription:', sub);
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: '#fff',
              border: '0.5px solid #E2E8E1',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#2F3E46',
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}
          >
            Enable Notifications →
          </button>
        </div>

        {/* Export */}
        <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
          <label style={labelStyle}>Message History</label>
          <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '12px', lineHeight: '1.6' }}>
            Export your patient message history as a CSV file for your records.
          </p>
          <button
            onClick={() => setShowExport(true)}
            style={{
              width: '100%', padding: '12px', background: '#fff',
              border: '0.5px solid #E2E8E1', borderRadius: '12px',
              fontSize: '11px', fontWeight: '600', color: '#2F3E46',
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}
          >
            Export Message History →
          </button>
        </div>
      </div>

      {showExport && (
        <ExportMessages
          clinicNumber={profile?.clinic_number}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Toast */}
      {showToast && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '12px', right: '12px',
          background: '#2F3E46', color: 'white', padding: '12px 16px',
          borderRadius: '12px', fontSize: '12px', textAlign: 'center',
          zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
        }}>
          ✓ Settings saved successfully
        </div>
      )}
    </div>
  );
}

export default Settings;