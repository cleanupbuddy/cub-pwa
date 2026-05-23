import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import VoiceCall from './VoiceCall';
import { setUnreadBadge } from '../lib/badge';
import { VERCEL_URL } from '../lib/config';

function ChatWindow({ contact, clinicNumber, therapistName, clinicName, practitionerNumber, isArchivedView, onArchived, onRead, onBack, currentUserId }) {
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

  const isMobile = /iPhone|iPod|Android.*Mobile/.test(navigator.userAgent);
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const loadMessages = async () => {
    if (!currentUserId || !contact?.phone) {
      return [];
    }

    setIsRefreshing(true);

    const withTimeout = (promise, ms) => Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), ms))
    ]);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('messages')
            .select('*')
            .eq('practitioner_id', currentUserId)
            .or(`from_number.eq.${contact.phone},to_number.eq.${contact.phone}`)
            .neq('status', 'draft')
            .order('created_at', { ascending: true }),
          5000
        );

        if (error) throw error;

        if (data && data.length > 0) {
          console.log('✅ Messages loaded:', data.length, contact.phone);
          setMessages(data);
          return data;
        }

        console.warn(`Messages empty on attempt ${attempt}, retrying...`);
      } catch (err) {
        console.error('Load messages error:', err);
      }

      if (attempt < 3) {
        await sleep(700 * attempt);
      }
    }

    return [];
  };

  useEffect(() => {
    let channel;
    let cancelled = false;

    const subscribeToChannel = () => {
      if (channel) supabase.removeChannel(channel);
      channel = supabase
        .channel(`chat:${contact.phone}:${currentUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `practitioner_id=eq.${currentUserId}`
          },
          async (payload) => {
            const row = payload.new || payload.old;
            if (!row || cancelled) return;
            if (row.from_number === contact.phone || row.to_number === contact.phone) {
              await loadMessages();
              if (row.direction === 'inbound') {
                await markAsRead();
              }
            }
          }
        )
        .subscribe();
    };

    const setupChat = async () => {
      if (!currentUserId || !contact?.phone || cancelled) return;
      const data = await loadMessages();
      if (cancelled) return;
      await markAsRead();
      subscribeToChannel();
    };

    setupChat();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [contact.phone, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  const saveName = async () => {
    setEditingName(false);

    if (!contactName.trim()) return;

    try {
      if (!currentUserId) {
        console.error('No active user while saving contact name');
        return;
      }

      const { error } = await supabase
        .from('contacts')
        .upsert([{
          phone_number: contact.phone,
          display_name: contactName.trim(),
          practitioner_id: currentUserId
        }], {
          onConflict: 'practitioner_id,phone_number'
        });

      if (error) throw error;

      console.log('✅ Contact name saved:', contactName);

      if (onRead) onRead();
    } catch (err) {
      console.error('Save name error:', err);
      alert('Could not save patient name. Please try again.');
    }
  };

  useEffect(() => {
    setContactName(contact?.name || '');
  }, [contact?.phone, contact?.name]);

  const refreshUnreadBadge = async () => {
    if (!currentUserId) return;

    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('practitioner_id', currentUserId)
        .eq('direction', 'inbound')
        .eq('is_read', false)
        .eq('is_archived', false)
        .neq('status', 'draft');

      if (error) throw error;

      await setUnreadBadge(count || 0);
    } catch (err) {
      console.error('Badge refresh error:', err);
    }
  };

  const markAsRead = async () => {
    if (!currentUserId || !contact?.phone) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('practitioner_id', currentUserId)
      .eq('from_number', contact.phone)
      .eq('is_read', false);

    await refreshUnreadBadge();

    if (onRead) onRead();
  };

  const sendMessage = async (overrideBody = null) => {
    const body = (overrideBody ?? newMessage).trim();
    if (!body || !clinicNumber || sending) return;

    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      body,
      direction: 'outbound',
      to_number: contact.phone,
      from_number: clinicNumber,
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    try {
      const response = await fetch(`${VERCEL_URL}/api/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: contact.phone,
          from: clinicNumber,
          message: body
        })
      });

      let result;

      try {
        result = await response.json();
      } catch (err) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server error (non-JSON response)');
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      if (result.message) {
        setMessages(prev =>
          prev.map(msg => msg.id === tempId ? result.message : msg)
        );
      } else {
        await loadMessages();
      }

      if (onRead) onRead();
    } catch (err) {
      console.error('Send failed:', err);

      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId
            ? { ...msg, status: 'failed', isLocalFailure: true }
            : msg
        )
      );
    } finally {
      setSending(false);
    }
  };

  const retryMessage = async (failedMsg) => {
    if (!failedMsg?.body || sending) return;

    setMessages(prev => prev.filter(msg => msg.id !== failedMsg.id));
    await sendMessage(failedMsg.body);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const formatDaySeparator = (timestamp) => {
    if (!timestamp) return '';

    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (isSameDay(messageDate, today)) return 'Today';
    if (isSameDay(messageDate, yesterday)) return 'Yesterday';

    const diffInDays = Math.floor(
      (today.setHours(0, 0, 0, 0) - new Date(messageDate).setHours(0, 0, 0, 0)) / 86400000
    );

    if (diffInDays < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'long' });
    }

    return messageDate.toLocaleDateString([], {
      month: 'long',
      day: 'numeric',
      year: messageDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const archiveConversation = async (archive = true) => {
    try {
      await supabase
        .from('messages')
        .update({ is_archived: archive })
        .eq('practitioner_id', currentUserId)
        .or(`from_number.eq.${contact.phone},to_number.eq.${contact.phone}`);

      // Also update contacts table
      await supabase
        .from('contacts')
        .update({ is_archived: archive })
        .eq('practitioner_id', currentUserId)
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

  const visibleMessages = messages.filter(
    msg =>
      msg.direction === 'system' ||
      msg.from_number === contact.phone ||
      msg.to_number === contact.phone
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: isMobile ? '100dvh' : '100%',
      width: '100%',
      minWidth: 0,
      position: 'relative',
      background: '#FDFDFD',
      overflow: 'hidden'
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
                fontSize: '16px', fontWeight: '500', color: '#2F3E46',
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
        minHeight: 0,
        overflowY: 'auto',
        padding: '14px',
        paddingTop: '14px',
        paddingBottom: '20px',
        background: '#FDFDFD',
        display: 'flex',
        flexDirection: 'column',
        WebkitOverflowScrolling: 'touch'
      }}>
        {visibleMessages.map((msg, index) => {

          if (msg.direction === 'system') {
            return (
              <div key={msg.id} style={{
                textAlign: 'center',
                fontSize: '11px',
                color: '#94A3B8',
                margin: '10px 0'
              }}>
                {msg.body} · {formatTime(msg.created_at)}
              </div>
            );
          }
          const prevMsg = visibleMessages[index - 1];

          const isNewDay =
            !prevMsg ||
            new Date(prevMsg.created_at).toDateString() !== new Date(msg.created_at).toDateString();

          return (
            <React.Fragment key={msg.id}>
              {isNewDay && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  margin: '8px 0 14px'
                }}>
                  <div style={{
                    fontSize: '10px',
                    color: '#94A3B8',
                    background: '#F7F6F2',
                    border: '0.5px solid #E2E8E1',
                    borderRadius: '999px',
                    padding: '4px 10px',
                    fontWeight: '500'
                  }}>
                    {formatDaySeparator(msg.created_at)}
                  </div>
                </div>
              )}

              <div style={{
                alignSelf: msg.direction === 'outbound' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                marginBottom: '12px'
              }}>
                <div
                  onClick={() => {
                    if (msg.direction === 'outbound' && msg.isLocalFailure) {
                      retryMessage(msg);
                    }
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    background:
                      msg.direction === 'outbound'
                        ? msg.isLocalFailure
                          ? '#E57373'
                          : '#739E6E'
                        : '#F8F9F7',
                    color: msg.direction === 'outbound' ? 'white' : '#2F3E46',
                    border: msg.direction === 'inbound' ? '0.5px solid #E2E8E1' : 'none',
                    borderBottomRightRadius: msg.direction === 'outbound' ? '2px' : '12px',
                    borderBottomLeftRadius: msg.direction === 'inbound' ? '2px' : '12px',
                    cursor:
                      msg.direction === 'outbound' && msg.isLocalFailure
                        ? 'pointer'
                        : 'default',
                    opacity: msg.status === 'sending' ? 0.85 : 1
                  }}
                >
                  {msg.body}
                </div>
                <div style={{
                  fontSize: '9px',
                  color: msg.isLocalFailure ? '#E57373' : '#94A3B8',
                  marginTop: '3px',
                  textAlign: msg.direction === 'outbound' ? 'right' : 'left'
                }}>
                  {formatTime(msg.created_at)}
                  {msg.direction === 'outbound' && msg.status === 'sending' && ' · Sending...'}
                  {msg.direction === 'outbound' && msg.isLocalFailure && ' · Failed — tap to retry'}
                  {msg.direction === 'outbound' && !msg.status && !msg.isLocalFailure && ' · Sent'}
                </div>
              </div>
            </React.Fragment>
          );
        })}
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
        paddingTop: '10px',
        paddingLeft: '12px',
        paddingRight: '12px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        borderTop: '0.5px solid #E2E8E1',
        background: '#fff',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        flexShrink: 0,
        overflow: 'visible',
        boxSizing: 'border-box'
      }}>

        <textarea
          value={newMessage}
          onChange={e => {
            setNewMessage(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          onKeyDown={e => {
            if (isMobile) return;

            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          enterKeyHint={isMobile ? 'enter' : 'send'}
          placeholder="Message..."
          style={{
            flex: 1,
            background: '#F7F6F2',
            border: '0.5px solid #E2E8E1',
            borderRadius: '16px',
            padding: '10px 14px',
            fontSize: '16px',
            color: '#2F3E46',
            resize: 'none',
            fontFamily: "'Outfit', sans-serif",
            outline: 'none',
            boxSizing: 'border-box',
            minHeight: '42px',
            maxHeight: '120px',
            overflowY: 'auto'
          }}
        />

        <button
          onClick={() => sendMessage()}
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
                .eq('practitioner_id', currentUserId)
                .or(`from_number.eq.${contact.phone},to_number.eq.${contact.phone}`);
              await supabase
                .from('contacts')
                .update({ is_archived: false })
                .eq('practitioner_id', currentUserId)
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