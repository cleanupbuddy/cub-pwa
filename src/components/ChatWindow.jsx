import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import VoiceCall from './VoiceCall';

import { VERCEL_URL } from '../lib/config';

function ChatWindow({ contact, clinicNumber, therapistName, clinicName, practitionerNumber, isArchivedView, onArchived, onRead, onBack, refreshTrigger }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [contactName, setContactName] = useState(contact.name || '');
  const bottomRef = useRef(null);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [archived, setArchived] = useState(false);
  const [archiveError, setArchiveError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPhone, setCurrentPhone] = useState(null);

  const loadMessages = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setIsRefreshing(true);

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('practitioner_id', session.user.id)
      .or(`from_number.eq.${contact.phone},to_number.eq.${contact.phone}`)
      .neq('status', 'draft')
      .order('created_at', { ascending: true });

    if (data) setMessages(data);

    setIsRefreshing(false);
  };

  useEffect(() => {
    let channel;

    const setupChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Only clear when switching contacts
      if (currentPhone !== contact.phone) {
        setMessages([]);
        setCurrentPhone(contact.phone);
      }

      await loadMessages();
      await markAsRead();
      await loadMessages();

      channel = supabase
        .channel(`chat:${contact.phone}:${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `practitioner_id=eq.${session.user.id}`
          },
          async (payload) => {
            const row = payload.new || payload.old;
            if (!row) return;

            if (
              row.from_number === contact.phone ||
              row.to_number === contact.phone
            ) {
              await loadMessages();
            }
          }
        )
        .subscribe();
    };

    setupChat();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [contact.phone, contact.name, contact.isArchived]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await loadMessages();
          await markAsRead();
          await loadMessages();
        } catch (err) {
          console.error('Chat wake refresh error:', err);
        }
      }
    };

    const handlePageShow = async () => {
      try {
        await loadMessages();
        await markAsRead();
        await loadMessages();
      } catch (err) {
        console.error('Chat pageshow refresh error:', err);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [contact.phone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveName = async () => {
    setEditingName(false);
    if (!contactName.trim()) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone_number', contact.phone)
        .eq('practitioner_id', session.user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('contacts')
          .update({ display_name: contactName })
          .eq('id', existing.id);
      } else {
        await supabase.from('contacts')
          .insert([{
            phone_number: contact.phone,
            display_name: contactName,
            practitioner_id: session.user.id
          }]);
      }
    } catch (err) {
      console.error('Save name error:', err);
    }
  };

  const markAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('practitioner_id', session.user.id)
      .eq('from_number', contact.phone)
      .eq('is_read', false);

    if (onRead) onRead();
  };

  const sendMessage = async () => {
    const body = newMessage.trim();
    if (!body || !clinicNumber) return;
    setSending(true);
    try {
      const response = await fetch(`${VERCEL_URL}/api/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: contact.phone, from: clinicNumber, message: body })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('messages').insert([{
        body, direction: 'outbound',
        to_number: contact.phone,
        from_number: clinicNumber,
        practitioner_id: session?.user?.id
      }]);
      setNewMessage('');
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const archiveConversation = async (archive = true) => {
    try {
      await supabase
        .from('messages')
        .update({ is_archived: archive })
        .or(`from_number.eq.${contact.phone},to_number.eq.${contact.phone}`);

      // Also update contacts table
      await supabase
        .from('contacts')
        .update({ is_archived: archive })
        .eq('phone_number', contact.phone);
      setArchived(true);
      setTimeout(() => {
        setArchived(false);
        if (onArchived) onArchived();
        if (!archive) {
          if (onBack) onBack();
        }
      }, 2000);
    } catch (err) {
      console.error('Archive error:', err);
      // Show error in existing toast area
      setArchiveError(true);
      setTimeout(() => setArchiveError(false), 3000);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      minWidth: 0,
      position: 'relative',
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: '#FDFDFD'
    }}>

      {/* Chat header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '0.5px solid #E2E8E1',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#588157',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 6px',
            lineHeight: 1,
            flexShrink: 0
          }}
          aria-label="Back to conversations"
        >
          ←
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName ? (
            <input
              type="text"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => e.key === 'Enter' && saveName()}
              autoFocus
              placeholder="Add patient name..."
              style={{
                fontSize: '14px', fontWeight: '500', color: '#2F3E46',
                border: 'none', borderBottom: '1px solid #9CAF88',
                outline: 'none', background: 'none', width: '100%',
                fontFamily: "'Outfit', sans-serif", padding: '0'
              }}
            />
          ) : (
            <div
              onClick={() => setEditingName(true)}
              style={{
                fontSize: '14px', fontWeight: '500', color: '#2F3E46',
                cursor: 'pointer'
              }}
            >
              {contactName || <span style={{ color: '#C5CAD2' }}>Add name...</span>}
            </div>
          )}
          <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '1px' }}>
            {contact.phone}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            archiveConversation(!isArchivedView);
          }}
          title={isArchivedView ? 'Restore conversation' : 'Archive conversation'}
          style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: isArchivedView ? '#588157' : '#F7F6F2',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0
          }}
        >
          {isArchivedView ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3.75" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          )}
        </button>

        <button
          onClick={() => setShowVoiceCall(true)}
          title="Voice call"
          style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: '#EAF3DE', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#588157" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px',
        paddingBottom: '20px',
        background: '#FDFDFD',
        display: 'flex',
        flexDirection: 'column',
        WebkitOverflowScrolling: 'touch'
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{
            alignSelf: msg.direction === 'outbound' ? 'flex-end' : 'flex-start',
            maxWidth: '75%', marginBottom: '12px'
          }}>
            <div style={{
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              lineHeight: '1.5',
              background: msg.direction === 'outbound' ? '#739E6E' : '#F8F9F7',
              color: msg.direction === 'outbound' ? 'white' : '#2F3E46',
              border: msg.direction === 'inbound' ? '0.5px solid #E2E8E1' : 'none',
              borderBottomRightRadius: msg.direction === 'outbound' ? '2px' : '12px',
              borderBottomLeftRadius: msg.direction === 'inbound' ? '2px' : '12px',
            }}>
              {msg.body}
            </div>
            <div style={{
              fontSize: '9px', color: '#94A3B8', marginTop: '3px',
              textAlign: msg.direction === 'outbound' ? 'right' : 'left'
            }}>
              {formatTime(msg.created_at)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div style={{
        padding: '8px 12px',
        background: '#fff',
        borderTop: '0.5px solid #E2E8E1',
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap'
      }}>
        {[
          { label: 'Intro', text: `Hi, this is ${therapistName} from ${clinicName}. This is my direct clinic phone number — feel free to reach me here anytime.` },
          { label: 'Pre-call', text: `Hi, this is ${therapistName} from ${clinicName}. I will be calling you from this number in a moment.` },
          { label: 'Late?', text: 'Hi! Just a reminder that your appointment is coming up. Are you on your way?' },
          { label: 'Cancellation', text: `Hi! This is ${therapistName} from ${clinicName}. We had a late cancellation and have an opening available. Would you like to book it?` }
        ].map(action => (
          <button
            key={action.label}
            onClick={() => setNewMessage(action.text)}
            style={{
              padding: '4px 10px', borderRadius: '20px',
              border: '0.5px solid #E2E8E1', background: '#F7F6F2',
              fontSize: '10px', color: '#588157', fontWeight: '500',
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif"
            }}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        borderTop: '0.5px solid #E2E8E1',
        background: '#fff',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        flexShrink: 0
      }}>

        <textarea
          value={newMessage}
          onChange={e => {
            setNewMessage(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, window.innerHeight * 0.15) + 'px';
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Message..."
          style={{
            flex: 1, background: '#F7F6F2', border: '0.5px solid #E2E8E1',
            borderRadius: '16px', padding: '10px 14px', fontSize: '13px',
            color: '#2F3E46', resize: 'none', fontFamily: "'Outfit', sans-serif",
            outline: 'none', boxSizing: 'border-box',
            minHeight: '42px',
            maxHeight: '120px',
            overflowY: 'auto'
          }}
        />

        <button
          onClick={sendMessage}
          disabled={sending || !newMessage.trim()}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: sending || !newMessage.trim() ? '#E2E8E1' : '#588157',
            border: 'none', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: sending ? 'not-allowed' : 'pointer',
            flexShrink: 0
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      {showVoiceCall && (
        <VoiceCall
          contact={contact}
          clinicNumber={clinicNumber}
          practitionerNumber={practitionerNumber}
          therapistName={therapistName}
          clinicName={clinicName}
          onClose={() => setShowVoiceCall(false)}
        />
      )}
      {archiveError && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '12px', right: '12px',
          background: '#E57373', color: 'white', padding: '12px 16px',
          borderRadius: '12px', fontSize: '12px', textAlign: 'center',
          zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
        }}>
          ⚠️ Could not archive. Please try again.
        </div>
      )}
      {archived && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '12px', right: '12px',
          background: '#2F3E46', color: 'white', padding: '12px 16px',
          borderRadius: '12px', fontSize: '12px', textAlign: 'center',
          zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span>{isArchivedView ? 'Conversation restored ✓' : 'Conversation archived ✓'}</span>
          <button
            onClick={async () => {
              await supabase
                .from('messages')
                .update({ is_archived: false })
                .or(`from_number.eq.${contact.phone},to_number.eq.${contact.phone}`);
              await supabase
                .from('contacts')
                .update({ is_archived: false })
                .eq('phone_number', contact.phone);
              setArchived(false);
              if (onArchived) onArchived();
            }}

            style={{
              background: 'none', border: 'none', color: '#9CAF88',
              fontSize: '11px', fontWeight: '600', cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;