import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ExportMessages from '../components/ExportMessages';
import { registerPushNotifications } from '../lib/notifications';

import { VERCEL_URL } from '../lib/config';
import { PROFESSIONS } from '../constants/professions';

const LONG_FORM_TO_CODE = {
  'Acupuncturist': 'LAc',
  'Midwife': 'MW',
  'Naturopath': 'ND',
  'Nurse Practitioner': 'NP',
  'Occupational Therapist': 'OT',
  'Physiotherapist': 'PT',
  'Psychologist': 'RPsych',
  'Social Worker': 'RSW',
};

function Settings({ onBack, profile, onProfileUpdate }) {
  const [therapistName, setTherapistName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [practitionerNumber, setPractitionerNumber] = useState('+1');
  const [professionType, setProfessionType] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [autoReplyMsg, setAutoReplyMsg] = useState('');
  const [enableAutoReply, setEnableAutoReply] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const [otherProfessionAbbreviation, setOtherProfessionAbbreviation] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleteAllStep, setDeleteAllStep] = useState(1);
  const [deleteAllAgreed, setDeleteAllAgreed] = useState(false);
  const [deleteAllTyped, setDeleteAllTyped] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteAccountStep, setDeleteAccountStep] = useState(1);
  const [deleteAccountAgreed, setDeleteAccountAgreed] = useState(false);
  const [deleteAccountTyped, setDeleteAccountTyped] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (profile) {
      setTherapistName(profile.therapist_name || '');
      setClinicName(profile.clinic_name || '');
      setPractitionerNumber(profile.practitioner_phone || '+1');
      const pt = profile.profession_type || '';
      if (pt.startsWith('Other: ')) {
        setProfessionType('OTHER');
        setOtherProfession(pt.replace('Other: ', ''));
        setOtherProfessionAbbreviation(profile.profession_abbreviation || '');
      } else if (pt === 'Other') {
        setProfessionType('OTHER');
        setOtherProfessionAbbreviation(profile.profession_abbreviation || '');
      } else if (LONG_FORM_TO_CODE[pt]) {
        setProfessionType(LONG_FORM_TO_CODE[pt]);
      } else if (pt && !PROFESSIONS.find(p => p.value === pt)) {
        setProfessionType('OTHER');
        setOtherProfession(pt);
        setOtherProfessionAbbreviation(profile.profession_abbreviation || '');
      } else {
        setProfessionType(pt);
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

      const finalProfessionType = professionType === 'OTHER' && otherProfession.trim()
        ? otherProfession.trim()
        : professionType;

      const finalProfessionAbbreviation = professionType === 'OTHER'
        ? otherProfessionAbbreviation.trim().toUpperCase()
        : professionType;

      await supabase.from('practitioners').update({
        therapist_name: therapistName,
        clinic_name: clinicName,
        profession_type: finalProfessionType,
        profession_abbreviation: finalProfessionAbbreviation,
        registration_number: registrationNumber,
        auto_reply_msg: autoReplyMsg,
        enable_auto: enableAutoReply,
        days_off: daysOff,
        in_session_msg: inSessionMsg,
        enable_in_session_auto: enableInSessionAuto,
      }).eq('user_email', session.user.email);

      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        if (onProfileUpdate) onProfileUpdate();
      }, 2000);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteAllConversations = async () => {
    if (deletingAll) return;
    setDeletingAll(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.from('messages')
        .delete()
        .eq('practitioner_id', session.user.id);

      await supabase.from('contacts')
        .delete()
        .eq('practitioner_id', session.user.id);

      await supabase.from('export_logs')
        .delete()
        .eq('practitioner_id', session.user.id);

      await supabase.from('deletion_logs').insert([{
        practitioner_id: session.user.id,
        practitioner_email: session.user.email,
        action: 'delete_all_conversations',
        agreed_to_terms: true,
        details: { scope: 'all_messages_contacts_export_logs' }
      }]);

      setShowDeleteAll(false);
      setDeleteAllStep(1);
      setDeleteAllAgreed(false);
      setDeleteAllTyped('');
      if (onProfileUpdate) onProfileUpdate();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error('Delete all error:', err);
    } finally {
      setDeletingAll(false);
    }
  };

  const deleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.from('deletion_logs').insert([{
        practitioner_id: session.user.id,
        practitioner_email: session.user.email,
        action: 'delete_account',
        agreed_to_terms: true,
        details: { scope: 'full_account_deletion' }
      }]);

      await supabase.from('messages')
        .delete()
        .eq('practitioner_id', session.user.id);

      await supabase.from('contacts')
        .delete()
        .eq('practitioner_id', session.user.id);

      await supabase.from('export_logs')
        .delete()
        .eq('practitioner_id', session.user.id);

      await supabase.from('practitioners')
        .delete()
        .eq('id', session.user.id);

      await supabase.auth.signOut();
      localStorage.clear();
      window.location.href = '/login';
    } catch (err) {
      console.error('Delete account error:', err);
      setDeletingAccount(false);
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

  const inputStyle = {
    width: '100%',
    marginTop: '4px',
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    fontSize: '16px',
    backgroundColor: '#fff',
    color: '#2F3E46',
    boxSizing: 'border-box',
    fontFamily: "'Outfit', sans-serif",
    cursor: 'text',
    outline: 'none',
  };


  const cardStyle = {
    background: '#fff',
    borderRadius: '16px',
    border: '0.5px solid rgba(47,62,70,0.08)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    overflow: 'hidden',
    marginBottom: '16px',
  };

  const cardHeaderStyle = {
    padding: '12px 16px',
    borderBottom: '0.5px solid rgba(47,62,70,0.08)',
    fontSize: '13px',
    fontWeight: '600',
    color: '#2F3E46',
  };

  const cardBodyStyle = {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const fieldLabelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
    marginBottom: '6px',
  };

  const lockedInputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    fontSize: '16px',
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
    boxSizing: 'border-box',
    fontFamily: "'Outfit', sans-serif",
    cursor: 'not-allowed',
    outline: 'none',
  };

  const fieldNoteStyle = {
    fontSize: '11px',
    color: '#94A3B8',
    marginTop: '6px',
    lineHeight: '1.5',
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
        <div style={{ width: '44px' }} />
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px 140px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Card 1: Practice profile */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Practice profile</div>
          <div style={cardBodyStyle}>

            <div>
              <label style={fieldLabelStyle}>Therapist name</label>
              <input
                type="text"
                value={therapistName}
                onChange={e => setTherapistName(e.target.value)}
                placeholder="e.g. Jamie, RMT"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>Clinic name</label>
              <input
                type="text"
                value={clinicName}
                onChange={e => setClinicName(e.target.value)}
                placeholder="e.g. Juniper Wellness"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>Profession type</label>
              <select
                value={professionType}
                onChange={e => setProfessionType(e.target.value)}
                style={{ ...inputStyle, appearance: 'auto' }}
              >
                <option value="">Select your profession...</option>
                {PROFESSIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              {professionType === 'OTHER' && (
                <input
                  type="text"
                  placeholder="Please specify your profession"
                  value={otherProfession}
                  onChange={e => setOtherProfession(e.target.value)}
                  style={{ ...inputStyle, marginTop: '8px' }}
                />
              )}
              {professionType === 'OTHER' && (
                <input
                  type="text"
                  placeholder="Abbreviation (e.g. ST)"
                  value={otherProfessionAbbreviation}
                  onChange={e => setOtherProfessionAbbreviation(e.target.value.toUpperCase())}
                  maxLength={10}
                  style={{ ...inputStyle, marginTop: '8px' }}
                />
              )}
            </div>

            <div>
              <label style={fieldLabelStyle}>Registration number</label>
              <input
                type="text"
                value={registrationNumber}
                onChange={e => setRegistrationNumber(e.target.value)}
                placeholder="e.g. 12345"
                style={inputStyle}
              />
              <p style={fieldNoteStyle}>Helps us verify you're a registered practitioner. Never visible to patients.</p>
            </div>

          </div>
        </div>

        {/* Card 2: Phone & number */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Phone & number</div>
          <div style={cardBodyStyle}>

            <div>
              <label style={fieldLabelStyle}>Personal mobile</label>
              <input
                type="text"
                value={practitionerNumber}
                readOnly
                style={lockedInputStyle}
              />
              <p style={fieldNoteStyle}>Contact support to update your mobile number.</p>
            </div>

            <div>
              <label style={fieldLabelStyle}>CUB clinic number</label>
              <input
                type="text"
                value={profile?.clinic_number || ''}
                readOnly
                style={lockedInputStyle}
              />
              <p style={fieldNoteStyle}>Your clinic number is permanent. Contact support if you need assistance.</p>
              {!profile?.clinic_number && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <select
                      value={areaCode}
                      onChange={e => setAreaCode(e.target.value)}
                      style={{ ...inputStyle, width: '140px', marginTop: 0 }}
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
                      style={{ ...inputStyle, marginTop: 0, marginBottom: '8px' }}
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

          </div>
        </div>

        {/* Card 3: Days off */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Days off</div>
          <div style={cardBodyStyle}>
            <p style={fieldNoteStyle}>
              CUB will automatically set you to Off Duty on these days.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                <label key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '12px', color: '#2F3E46',
                  cursor: 'pointer',
                  padding: '8px 12px', background: '#F7F6F2',
                  borderRadius: '10px', border: '0.5px solid #E2E8E1'
                }}>
                  <input
                    type="checkbox"
                    checked={daysOff.includes(i)}
                    onChange={e => {
                      if (e.target.checked) {
                        setDaysOff([...daysOff, i]);
                      } else {
                        setDaysOff(daysOff.filter(d => d !== i));
                      }
                    }}
                    style={{ accentColor: '#588157' }}
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Card 4: In Session Auto-Reply */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>In Session auto-reply</div>
          <div style={cardBodyStyle}>
            <p style={fieldNoteStyle}>
              Automatically sent to patients when you're In Session.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableInSessionAuto}
                onChange={e => setEnableInSessionAuto(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#588157' }}
              />
              <span style={{ fontSize: '12px', color: '#2F3E46' }}>Enable auto-reply when In Session</span>
            </label>
            <textarea
              value={inSessionMsg}
              onChange={e => setInSessionMsg(e.target.value)}
              placeholder={"e.g. Hi! I'm with a patient right now.\nFeel free to book your next appointment online: [your booking link]"}
              style={{ ...inputStyle, resize: 'none', height: '80px' }}
            />
            <p style={{ fontSize: '10px', color: '#9CAF88', margin: '0', lineHeight: '1.6' }}>
              💡 Tip: Include your booking link so patients can self-book while you're away.
            </p>
          </div>
        </div>

        {/* Card 5: Off Duty Auto-Reply */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Off Duty auto-reply</div>
          <div style={cardBodyStyle}>
            <p style={fieldNoteStyle}>
              Automatically sent to patients when you're Off Duty.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableAutoReply}
                onChange={e => setEnableAutoReply(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#588157' }}
              />
              <span style={{ fontSize: '12px', color: '#2F3E46' }}>Enable auto-reply when Off Duty</span>
            </label>
            <textarea
              value={autoReplyMsg}
              onChange={e => setAutoReplyMsg(e.target.value)}
              placeholder={"e.g. Hi! I'm currently off duty and will be back on Monday.\nYou can book online anytime at [your booking link]"}
              style={{ ...inputStyle, resize: 'none', height: '80px' }}
            />
            <p style={{ fontSize: '10px', color: '#9CAF88', margin: '0', lineHeight: '1.6' }}>
              💡 Tip: Include your booking link so patients can self-book while you're away.
            </p>
          </div>
        </div>

        {/* Card 6: Subscription */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Subscription</div>
          <div style={cardBodyStyle}>
            <p style={fieldNoteStyle}>
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
        </div>

        {/* Card 7: Notifications */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Notifications</div>
          <div style={cardBodyStyle}>
            <p style={fieldNoteStyle}>
              Get alerted when patients message you, even when the app isn't open.
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', background: '#F7F6F2', border: '0.5px solid #E2E8E1',
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '13px', color: '#2F3E46' }}>Push notifications</span>
              <button
                onClick={async () => {
                  const isCurrentlyEnabled = profile?.notifications_enabled;
                  if (!isCurrentlyEnabled) {
                    const result = await registerPushNotifications();
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;
                    if (result.ok) {
                      await supabase.from('practitioners')
                        .update({ notifications_enabled: true })
                        .eq('id', session.user.id);
                      if (onProfileUpdate) onProfileUpdate();
                      setNotifMessage('Notifications enabled on this device.');
                    } else if (result.reason === 'denied') {
                      setNotifMessage('Notifications blocked. Go to device Settings → Notifications to allow them.');
                    } else if (result.reason === 'unsupported') {
                      setNotifMessage("Push notifications aren't supported on this browser.");
                    } else {
                      setNotifMessage('Could not enable notifications. Try again.');
                    }
                  } else {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;
                    await supabase.from('practitioners')
                      .update({ notifications_enabled: false })
                      .eq('id', session.user.id);
                    if (onProfileUpdate) onProfileUpdate();
                    setNotifMessage('Notifications disabled.');
                  }
                }}
                style={{
                  width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                  background: profile?.notifications_enabled ? '#588157' : '#D1D5DB',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: '3px',
                  left: profile?.notifications_enabled ? '23px' : '3px',
                  transition: 'left 0.2s'
                }} />
              </button>
            </div>
            {notifMessage && (
              <p style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.6', margin: '0' }}>
                {notifMessage}
              </p>
            )}
          </div>
        </div>

        {/* Card 8: Message history */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Message history</div>
          <div style={cardBodyStyle}>
            <p style={fieldNoteStyle}>
              Export your patient message history as a CSV file for your records. Conversations are archived to protect your professional records — you can permanently delete them at any time.
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
            <button
              onClick={() => setShowDeleteAll(true)}
              style={{
                width: '100%', padding: '12px', background: '#fff',
                border: '0.5px solid #F4C2C2', borderRadius: '12px',
                fontSize: '11px', fontWeight: '600', color: '#c0392b',
                cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginTop: '8px'
              }}
            >
              Delete All Conversations →
            </button>
          </div>
        </div>
      </div>

      {/* Card 9: Account */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>Account</div>
        <div style={cardBodyStyle}>
          <p style={fieldNoteStyle}>
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteAccount(true)}
            style={{
              width: '100%', padding: '12px', background: '#fff',
              border: '0.5px solid #F4C2C2', borderRadius: '12px',
              fontSize: '11px', fontWeight: '600', color: '#c0392b',
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}
          >
            Delete Account →
          </button>
        </div>
      </div>

      {/* Sticky footer: save */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTop: '0.5px solid #E2E8E1',
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        zIndex: 9,
      }}>
        <button
          onClick={saveSettings}
          disabled={saving}
          style={{
            width: '100%',
            padding: '12px',
            background: '#588157',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: "'Outfit', sans-serif",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>

      {showExport && (
        <ExportMessages
          clinicNumber={profile?.clinic_number}
          onClose={() => setShowExport(false)}
        />
      )}

      {showDeleteAll && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(47,62,70,0.6)', zIndex: 400,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          fontFamily: "'Outfit', sans-serif"
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px 20px 0 0',
            padding: '24px 20px 40px', width: '100%', maxWidth: '500px'
          }}>
            <div style={{ width: '36px', height: '4px', background: '#E2E8E1', borderRadius: '2px', margin: '0 auto 20px' }} />

            {deleteAllStep === 1 && (
              <>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#2F3E46', marginBottom: '8px' }}>
                  Delete all conversations?
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.7', marginBottom: '16px' }}>
                  This permanently deletes all patient messages and contacts. This cannot be undone.
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', lineHeight: '1.7', marginBottom: '20px', background: '#F7F6F2', borderRadius: '10px', padding: '12px' }}>
                  💡 We recommend exporting your message history before deleting.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    onClick={() => { setShowExport(true); setShowDeleteAll(false); }}
                    style={{
                      padding: '13px', background: '#fff', border: '0.5px solid #E2E8E1',
                      borderRadius: '12px', fontSize: '11px', fontWeight: '600', color: '#2F3E46',
                      cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                      textTransform: 'uppercase', letterSpacing: '0.08em'
                    }}
                  >
                    Export First
                  </button>
                  <button
                    onClick={() => setDeleteAllStep(2)}
                    style={{
                      padding: '13px', background: '#2F3E46', border: 'none',
                      borderRadius: '12px', fontSize: '11px', fontWeight: '600', color: 'white',
                      cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                      textTransform: 'uppercase', letterSpacing: '0.08em'
                    }}
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {deleteAllStep === 2 && (
              <>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#2F3E46', marginBottom: '16px' }}>
                  Before you continue
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={deleteAllAgreed}
                    onChange={e => setDeleteAllAgreed(e.target.checked)}
                    style={{ marginTop: '2px', accentColor: '#588157', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '11px', color: '#2F3E46', lineHeight: '1.6' }}>
                    I understand that deleted conversations cannot be recovered. I am responsible for retaining any records required by my regulatory college. The recommended approach is to copy relevant conversations into my patient charting software (e.g. Jane App) before deleting.
                  </span>
                </label>
                <button
                  onClick={() => { if (deleteAllAgreed) setDeleteAllStep(3); }}
                  disabled={!deleteAllAgreed}
                  style={{
                    width: '100%', padding: '13px', marginBottom: '10px',
                    background: deleteAllAgreed ? '#2F3E46' : '#E2E8E1',
                    color: deleteAllAgreed ? 'white' : '#94A3B8',
                    border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
                    cursor: deleteAllAgreed ? 'pointer' : 'not-allowed',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  Continue
                </button>
                <button
                  onClick={() => { setShowDeleteAll(false); setDeleteAllStep(1); setDeleteAllAgreed(false); }}
                  style={{
                    width: '100%', padding: '13px', background: 'none', border: 'none',
                    fontSize: '13px', color: '#94A3B8', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  Cancel
                </button>
              </>
            )}

            {deleteAllStep === 3 && (
              <>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#2F3E46', marginBottom: '8px' }}>
                  Type DELETE to confirm
                </div>
                <input
                  type="text"
                  value={deleteAllTyped}
                  onChange={e => setDeleteAllTyped(e.target.value)}
                  placeholder="Type DELETE here"
                  style={{
                    width: '100%', padding: '12px', marginBottom: '16px',
                    border: '0.5px solid #E2E8E1', borderRadius: '12px',
                    color: '#2F3E46', background: '#F7F6F2',
                    outline: 'none', fontFamily: "'Outfit', sans-serif",
                    boxSizing: 'border-box', fontSize: '16px'
                  }}
                />
                <button
                  onClick={deleteAllConversations}
                  disabled={deleteAllTyped !== 'DELETE' || deletingAll}
                  style={{
                    width: '100%', padding: '13px', marginBottom: '10px',
                    background: deleteAllTyped === 'DELETE' ? '#c0392b' : '#E2E8E1',
                    color: deleteAllTyped === 'DELETE' ? 'white' : '#94A3B8',
                    border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
                    cursor: deleteAllTyped === 'DELETE' ? 'pointer' : 'not-allowed',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  {deletingAll ? 'Deleting...' : 'Delete permanently'}
                </button>
                <button
                  onClick={() => { setShowDeleteAll(false); setDeleteAllStep(1); setDeleteAllAgreed(false); setDeleteAllTyped(''); }}
                  style={{
                    width: '100%', padding: '13px', background: 'none', border: 'none',
                    fontSize: '13px', color: '#94A3B8', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showDeleteAccount && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(47,62,70,0.6)', zIndex: 400,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          fontFamily: "'Outfit', sans-serif"
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px 20px 0 0',
            padding: '24px 20px 40px', width: '100%', maxWidth: '500px'
          }}>
            <div style={{ width: '36px', height: '4px', background: '#E2E8E1', borderRadius: '2px', margin: '0 auto 20px' }} />

            {deleteAccountStep === 1 && (
              <>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#2F3E46', marginBottom: '8px' }}>
                  Delete your account?
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.7', marginBottom: '16px' }}>
                  This permanently deletes your account, all patient messages, contacts, and clinic number. This cannot be undone.
                </div>
                <div style={{ fontSize: '11px', color: '#c0392b', lineHeight: '1.7', marginBottom: '20px', background: '#FFF0F0', borderRadius: '10px', padding: '12px' }}>
                  ⚠️ Deleting your account does not cancel your Stripe subscription. You will need to cancel it separately. We'll remind you at the final step.
                </div>
                <button
                  onClick={() => setDeleteAccountStep(2)}
                  style={{
                    width: '100%', padding: '13px', background: '#2F3E46', border: 'none',
                    borderRadius: '12px', fontSize: '11px', fontWeight: '600', color: 'white',
                    cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                    textTransform: 'uppercase', letterSpacing: '0.08em'
                  }}
                >
                  Continue
                </button>
              </>
            )}

            {deleteAccountStep === 2 && (
              <>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#2F3E46', marginBottom: '16px' }}>
                  Before you continue
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={deleteAccountAgreed}
                    onChange={e => setDeleteAccountAgreed(e.target.checked)}
                    style={{ marginTop: '2px', accentColor: '#588157', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '11px', color: '#2F3E46', lineHeight: '1.6' }}>
                    I understand that my account and all data will be permanently deleted. I am responsible for retaining any records required by my regulatory college. The recommended approach is to copy relevant conversations into my patient charting software (e.g. Jane App) before deleting.
                  </span>
                </label>
                <button
                  onClick={() => { if (deleteAccountAgreed) setDeleteAccountStep(3); }}
                  disabled={!deleteAccountAgreed}
                  style={{
                    width: '100%', padding: '13px', marginBottom: '10px',
                    background: deleteAccountAgreed ? '#2F3E46' : '#E2E8E1',
                    color: deleteAccountAgreed ? 'white' : '#94A3B8',
                    border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
                    cursor: deleteAccountAgreed ? 'pointer' : 'not-allowed',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  Continue
                </button>
                <button
                  onClick={() => { setShowDeleteAccount(false); setDeleteAccountStep(1); setDeleteAccountAgreed(false); }}
                  style={{
                    width: '100%', padding: '13px', background: 'none', border: 'none',
                    fontSize: '13px', color: '#94A3B8', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  Cancel
                </button>
              </>
            )}

            {deleteAccountStep === 3 && (
              <>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#2F3E46', marginBottom: '8px' }}>
                  Type DELETE to confirm
                </div>
                <input
                  type="text"
                  value={deleteAccountTyped}
                  onChange={e => setDeleteAccountTyped(e.target.value)}
                  placeholder="Type DELETE here"
                  style={{
                    width: '100%', padding: '12px', marginBottom: '16px',
                    border: '0.5px solid #E2E8E1', borderRadius: '12px',
                    color: '#2F3E46', background: '#F7F6F2',
                    outline: 'none', fontFamily: "'Outfit', sans-serif",
                    boxSizing: 'border-box', fontSize: '16px'
                  }}
                />
                <button
                  onClick={() => { if (deleteAccountTyped === 'DELETE') setDeleteAccountStep(4); }}
                  disabled={deleteAccountTyped !== 'DELETE'}
                  style={{
                    width: '100%', padding: '13px', marginBottom: '10px',
                    background: deleteAccountTyped === 'DELETE' ? '#2F3E46' : '#E2E8E1',
                    color: deleteAccountTyped === 'DELETE' ? 'white' : '#94A3B8',
                    border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
                    cursor: deleteAccountTyped === 'DELETE' ? 'pointer' : 'not-allowed',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  Continue
                </button>
                <button
                  onClick={() => { setShowDeleteAccount(false); setDeleteAccountStep(1); setDeleteAccountAgreed(false); setDeleteAccountTyped(''); }}
                  style={{
                    width: '100%', padding: '13px', background: 'none', border: 'none',
                    fontSize: '13px', color: '#94A3B8', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  Cancel
                </button>
              </>
            )}

            {deleteAccountStep === 4 && (
              <>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#c0392b', marginBottom: '8px' }}>
                  Last chance
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.7', marginBottom: '16px' }}>
                  Once you tap Delete Account, your account is gone permanently. Make sure you have cancelled your Stripe subscription.
                </div>
                <button
                  onClick={() => { openBillingPortal(); setShowDeleteAccount(false); }}
                  style={{
                    width: '100%', padding: '13px', marginBottom: '8px', background: '#fff',
                    border: '0.5px solid #E2E8E1', borderRadius: '12px',
                    fontSize: '11px', fontWeight: '600', color: '#2F3E46',
                    cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                    textTransform: 'uppercase', letterSpacing: '0.08em'
                  }}
                >
                  Cancel Subscription
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={deletingAccount}
                  style={{
                    width: '100%', padding: '13px', marginBottom: '10px',
                    background: '#c0392b', color: 'white',
                    border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
                    cursor: deletingAccount ? 'not-allowed' : 'pointer',
                    fontFamily: "'Outfit', sans-serif",
                    opacity: deletingAccount ? 0.7 : 1
                  }}
                >
                  {deletingAccount ? 'Deleting...' : 'Delete Account Permanently'}
                </button>
                <button
                  onClick={() => { setShowDeleteAccount(false); setDeleteAccountStep(1); setDeleteAccountAgreed(false); setDeleteAccountTyped(''); }}
                  style={{
                    width: '100%', padding: '13px', background: 'none', border: 'none',
                    fontSize: '13px', color: '#94A3B8', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '12px', right: '12px',
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