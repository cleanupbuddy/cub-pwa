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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAgreed, setDeleteAgreed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showContactMenu, setShowContactMenu] = useState(false);
  const [inputBarHeight, setInputBarHeight] = useState(80);
  const inputBarRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(60);
  const headerRef = useRef(null);
  const [viewportOffset, setViewportOffset] = useState(0);

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

  useEffect(() => {
    if (!inputBarRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setInputBarHeight(entry.contentRect.height);
      }
    });
    observer.observe(inputBarRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setHeaderHeight(entry.contentRect.height);
      }
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isMobile || !window.visualViewport) return;
    const handler = () => setViewportOffset(window.visualViewport.offsetTop);
    window.visualViewport.addEventListener('scroll', handler);
    window.visualViewport.addEventListener('resize', handler);
    return () => {
      window.visualViewport.removeEventListener('scroll', handler);
      window.visualViewport.removeEventListener('resize', handler);
    };
  }, [isMobile]);

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

      try {
        const saved = localStorage.getItem('cub_last_contact');
        if (saved) {
          const last = JSON.parse(saved);
          if (last.phone === contact.phone) {
            localStorage.setItem('cub_last_contact', JSON.stringify({ ...last, name: contactName.trim() }));
          }
        }
      } catch {}

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

  const deleteConversation = async () => {
    if (!deleteAgreed || deleting) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.from('messages')
        .delete()
        .eq('practitioner_id', currentUserId)
        .or(`from_number.eq.${contact.phone},to_number.eq.${contact.phone}`);

      await supabase.from('contacts')
        .delete()
        .eq('practitioner_id', currentUserId)
        .eq('phone_number', contact.phone);

      await supabase.from('deletion_logs').insert([{
        practitioner_id: currentUserId,
        practitioner_email: session.user.email,
        action: 'delete_contact',
        agreed_to_terms: true,
        details: { contact_phone: contact.phone, contact_name: contact.name || null }
      }]);

      setShowDeleteConfirm(false);
      if (onArchived) onArchived();
      if (onBack) onBack();
    } catch (err) {
      console.error('Delete conversation error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const markAsUnread = async () => {
    try {
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('practitioner_id', currentUserId)
        .eq('direction', 'inbound')
        .or(`from_number.eq.${contact.phone},to_number.eq.${contact.phone}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (messages && messages.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: false })
          .eq('id', messages[0].id);
      }

      setShowContactMenu(false);
      if (onBack) onBack();
    } catch (err) {
      console.error('Mark as unread error:', err);
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
      <div ref={headerRef} style={{
        ...(isMobile ? {
          position: 'fixed',
          top: viewportOffset + 'px',
          left: 0,
          right: 0,
          zIndex: 11,
        } : {
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }),
        padding: '12px 16px',
        borderBottom: '0.5px solid #E2E8E1',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
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
          onClick={e => { e.stopPropagation(); setShowContactMenu(true); }}
          style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: '#F7F6F2', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            fontSize: '16px', color: '#64748b', letterSpacing: '1px'
          }}
        >···</button>

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
        paddingTop: isMobile ? headerHeight + 'px' : '14px',
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
                  {msg.is_broadcast && (
                    <span style={{ marginLeft: '4px', color: '#94A3B8' }}>· 📢</span>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {/* Quick actions + input — fixed to bottom on mobile */}
      <div ref={inputBarRef} style={{
        flexShrink: 0,
        background: '#fff',
        borderTop: '0.5px solid #E2E8E1'
      }}>
      <div style={{
        padding: '8px 12px',
        background: '#fff',
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
      {showContactMenu && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(47,62,70,0.4)', zIndex: 400,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          fontFamily: "'Outfit', sans-serif"
        }}
        onClick={() => setShowContactMenu(false)}
        >
          <div style={{
            background: '#fff', borderRadius: '20px 20px 0 0',
            padding: '20px 20px 40px', width: '100%', maxWidth: '500px'
          }}
          onClick={e => e.stopPropagation()}
          >
            <div style={{ width: '36px', height: '4px', background: '#E2E8E1', borderRadius: '2px', margin: '0 auto 20px' }} />
            <button
              onClick={markAsUnread}
              style={{
                width: '100%', padding: '14px 16px', background: 'none', border: 'none',
                borderBottom: '0.5px solid #F1F5F9', textAlign: 'left',
                fontSize: '14px', color: '#2F3E46', cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: '12px'
              }}
            >
              🔵 Mark as unread
            </button>
            <button
              onClick={() => { setShowContactMenu(false); archiveConversation(!isArchivedView); }}
              style={{
                width: '100%', padding: '14px 16px', background: 'none', border: 'none',
                borderBottom: '0.5px solid #F1F5F9', textAlign: 'left',
                fontSize: '14px', color: '#2F3E46', cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: '12px'
              }}
            >
              {isArchivedView ? '↩ Add back to list' : '📋 Remove from list'}
            </button>
            <button
              onClick={() => { setShowContactMenu(false); setShowDeleteConfirm(true); setDeleteAgreed(false); }}
              style={{
                width: '100%', padding: '14px 16px', background: 'none', border: 'none',
                textAlign: 'left', fontSize: '14px', color: '#c0392b', cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif"
              }}
            >
              🗑 Delete permanently (PIPA)
            </button>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
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
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#2F3E46', marginBottom: '8px' }}>
              Delete this conversation?
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.7', marginBottom: '16px' }}>
              This permanently deletes all messages with {contact.name || contact.phone}. This cannot be undone.
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', lineHeight: '1.7', marginBottom: '16px', background: '#F7F6F2', borderRadius: '10px', padding: '12px' }}>
              💡 Permanent deletion is the PIPA-compliant method for responding to a patient's request to have their personal information removed. For all other situations, use Remove from list — your records stay protected and recoverable.
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={deleteAgreed}
                onChange={e => setDeleteAgreed(e.target.checked)}
                style={{ marginTop: '2px', accentColor: '#588157', flexShrink: 0 }}
              />
              <span style={{ fontSize: '11px', color: '#2F3E46', lineHeight: '1.6' }}>
                I understand that deleted conversations cannot be recovered. I am responsible for retaining any records required by my regulatory college.
              </span>
            </label>
            <button
              onClick={deleteConversation}
              disabled={!deleteAgreed || deleting}
              style={{
                width: '100%', padding: '13px', marginBottom: '10px',
                background: deleteAgreed ? '#c0392b' : '#E2E8E1',
                color: deleteAgreed ? 'white' : '#94A3B8',
                border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
                cursor: deleteAgreed ? 'pointer' : 'not-allowed',
                fontFamily: "'Outfit', sans-serif"
              }}
            >
              {deleting ? 'Deleting...' : 'Delete permanently'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                width: '100%', padding: '13px', background: 'none', border: 'none',
                fontSize: '13px', color: '#94A3B8', cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif"
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;