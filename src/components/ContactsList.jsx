import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { setUnreadBadge } from '../lib/badge';

function ContactsList({ onSelectContact, clinicNumber, onArchiveChange, viewingArchived, refreshTrigger, currentUserId, onBroadcast }) {
  const [contacts, setContacts] = useState([]);
  const [contactMap, setContactMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [selectedForBroadcast, setSelectedForBroadcast] = useState([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [allContactsForBroadcast, setAllContactsForBroadcast] = useState([]);

  const plusMenuRef = useRef(null);

  useEffect(() => {
    if (!showPlusMenu) return;
    const handleMouseDown = (e) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target)) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [showPlusMenu]);

  useEffect(() => {
    if (!broadcastMode || !currentUserId) return;
    const loadAll = async () => {
      const { data } = await supabase
        .from('contacts')
        .select('phone_number, display_name')
        .eq('practitioner_id', currentUserId)
        .order('display_name', { ascending: true, nullsFirst: false });
      if (data) {
        setAllContactsForBroadcast(data.map(c => ({
          phone: c.phone_number,
          name: c.display_name
        })));
      }
    };
    loadAll();
  }, [broadcastMode, currentUserId]);

  useEffect(() => {
    let channel;
    let cancelled = false;

    const setupContactsSubscription = async () => {
      if (!currentUserId || !clinicNumber) {
        console.warn('Contacts subscription skipped: missing user or clinic number');
        return;
      }

      await loadContacts(viewingArchived);

      if (cancelled) return;

      channel = supabase.channel(`contacts:messages:${currentUserId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `practitioner_id=eq.${currentUserId}`
        }, () => {
          loadContacts(viewingArchived);
        })
        .subscribe();
    };

    setupContactsSubscription();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [viewingArchived, refreshTrigger, currentUserId, clinicNumber]);

  const loadContacts = async (archived = viewingArchived) => {
    setLoading(true);

    const fallbackTimeout = setTimeout(() => {
      console.warn('Contacts load timed out');
      setLoading(false);
    }, 10000);

    try {
      if (!currentUserId || !clinicNumber) {
        console.warn('Contacts load skipped: missing user or clinic number');
        return;
      }

      const { data: messages } = await supabase
        .from('messages')
        .select('from_number, to_number, direction, body, created_at, is_read, is_archived')
        .eq('practitioner_id', currentUserId)
        .eq('is_archived', archived === true)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });

      const { data: contactsList } = await supabase
        .from('contacts')
        .select('phone_number, display_name, is_archived')
        .eq('practitioner_id', currentUserId)
        .eq('is_archived', archived === true);

      const map = {};
      if (contactsList) {
        contactsList.forEach(c => {
          map[c.phone_number] = c.display_name;
        });
      }
      setContactMap(map);

      const threads = {};

      messages?.forEach(msg => {
        const num = msg.direction === 'inbound' ? msg.from_number : msg.to_number;
        if (!num || num === clinicNumber) return;

        if (!threads[num]) {
          threads[num] = {
            phone: num,
            latest: msg,
            unreadCount: 0
          };
        }

        if (msg.direction === 'inbound' && !msg.is_read) {
          threads[num].unreadCount += 1;
        }

        if (new Date(msg.created_at) > new Date(threads[num].latest.created_at)) {
          threads[num].latest = msg;
        }
      });

      const unique = Object.values(threads);

      if (contactsList) {
        contactsList.forEach(c => {
          const alreadyExists = unique.some(u => u.phone === c.phone_number);
          if (!alreadyExists) {
            unique.push({ phone: c.phone_number, latest: null, unreadCount: 0 });
          }
        });
      }

      setContacts(prev => {
        const prevMap = {};
        prev.forEach(c => {
          prevMap[c.phone] = c;
        });

        const merged = unique.map(c => {
          const old = prevMap[c.phone];

          return {
            ...c,
            latest: c.latest || old?.latest || null,
            unreadCount: c.unreadCount ?? old?.unreadCount ?? 0
          };
        });

        return merged.sort((a, b) => {
          const aTime = a.latest?.created_at ? new Date(a.latest.created_at).getTime() : 0;
          const bTime = b.latest?.created_at ? new Date(b.latest.created_at).getTime() : 0;
          return bTime - aTime;
        });
      });

      const totalUnread = unique.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      await setUnreadBadge(totalUnread);
    } catch (err) {
      console.error('Load contacts error:', err);
    } finally {
      clearTimeout(fallbackTimeout);
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitials = (phone, name) => {
    if (name) return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return '#';
  };

  const avatarColors = ['#CAD2C5', '#D6BD98', '#A3B18A', '#C5CAD2'];
  const getAvatarColor = (phone) => {
    const digits = phone.replace(/\D/g, '');
    return avatarColors[parseInt(digits.slice(-1)) % 4];
  };

  const startNewChat = async () => {
    const cleaned = newPhone.replace(/\D/g, '');
    if (!cleaned) return;

    if (cleaned.length !== 10) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }

    const formatted = `+1${cleaned}`;

    try {
      if (!currentUserId) return;

      // First check whether this contact already exists
      const { data: existingContact, error: existingError } = await supabase
        .from('contacts')
        .select('id, is_archived, display_name')
        .eq('practitioner_id', currentUserId)
        .eq('phone_number', formatted)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingContact) {
        // If archived, restore it
        if (existingContact.is_archived) {
          const { error: restoreContactError } = await supabase
            .from('contacts')
            .update({ is_archived: false })
            .eq('id', existingContact.id);

          if (restoreContactError) throw restoreContactError;

          await supabase
            .from('messages')
            .update({ is_archived: false })
            .eq('practitioner_id', currentUserId)
            .or(`from_number.eq.${formatted},to_number.eq.${formatted}`);
        }

        onSelectContact(formatted, existingContact.display_name || null, false);
        setShowNewChat(false);
        setNewPhone('');
        await loadContacts(false);
        return;
      }

      // Otherwise create a brand new contact
      const { error: insertError } = await supabase
        .from('contacts')
        .insert([{
          practitioner_id: currentUserId,
          phone_number: formatted,
          display_name: null,
          is_archived: false
        }]);

      if (insertError) throw insertError;

      setContacts(prev => {
        if (prev.find(c => c.phone === formatted)) return prev;
        return [{ phone: formatted, latest: null, unreadCount: 0 }, ...prev];
      });

      onSelectContact(formatted, null, false);
      setShowNewChat(false);
      setNewPhone('');
    } catch (err) {
      console.error('New contact error:', err);
      alert('Could not open this conversation. Please try again.');
    }
  };

  const toggleArchived = () => {
    const newVal = !viewingArchived;
    if (onArchiveChange) onArchiveChange(newVal);
  };

  const toggleBroadcastContact = (phone) => {
    setSelectedForBroadcast(prev =>
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    );
  };

  const filtered = contacts.filter(c => {
    const name = contactMap[c.phone] || c.phone;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const showEmptyState = !loading && filtered.length === 0;

  const broadcastFiltered = allContactsForBroadcast.filter(c => {
    const name = c.name || contactMap[c.phone] || c.phone;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minWidth: 0 }}>
      {/* Search bar */}
      <div style={{ padding: '10px 12px', background: '#fff', borderBottom: '0.5px solid #E2E8E1' }}>
        {viewingArchived ? (
          <p style={{ fontSize: '10px', color: '#D6BD98', margin: '0 0 8px', letterSpacing: '0.05em', fontWeight: '600', textTransform: 'uppercase' }}>
            📦 Archived Conversations
          </p>
        ) : (
          <p style={{ fontSize: '10px', color: '#94A3B8', margin: '0 0 8px', letterSpacing: '0.05em' }}>
            {clinicNumber ? `Your active line: ${clinicNumber}` : ''}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search patients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, background: '#F7F6F2', border: '0.5px solid #E2E8E1',
              borderRadius: '20px', padding: '7px 14px', fontSize: '16px',
              color: '#2F3E46', fontFamily: "'Outfit', sans-serif", outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <div ref={plusMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => {
                if (broadcastMode) {
                  setBroadcastMode(false);
                  setSelectedForBroadcast([]);
                  setBroadcastMessage('');
                } else {
                  setShowPlusMenu(!showPlusMenu);
                }
              }}
              style={{
                width: '30px', height: '30px', background: '#588157',
                borderRadius: '50%', border: 'none', color: 'white',
                fontSize: '18px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}
            >+</button>
            {showPlusMenu && (
              <div style={{
                position: 'absolute', top: '36px', right: 0,
                background: '#fff', borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                border: '0.5px solid #E2E8E1',
                zIndex: 50, overflow: 'hidden', minWidth: '180px'
              }}>
                <button
                  onClick={() => { setShowPlusMenu(false); setShowNewChat(true); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 14px', fontSize: '13px', color: '#2F3E46',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0F4EE'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >New conversation</button>
                <button
                  onClick={() => { setShowPlusMenu(false); setBroadcastMode(true); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 14px', fontSize: '13px', color: '#2F3E46',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0F4EE'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >Broadcast message</button>
              </div>
            )}
          </div>
        </div>
        {showNewChat && (
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', background: '#F7F6F2', border: '0.5px solid #E2E8E1', borderRadius: '10px', padding: '8px 12px', gap: '4px' }}>
            <span style={{ fontSize: '16px', color: '#2F3E46', flexShrink: 0 }}>+1</span>
            <input
              type="text"
              placeholder="7785550123"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startNewChat()}
              style={{
                border: 'none', background: 'none', fontSize: '16px',
                fontFamily: "'Outfit', sans-serif", outline: 'none',
                width: '100%', color: '#2F3E46'
              }}
            />
            <button
              onClick={startNewChat}
              style={{
                background: '#588157', color: 'white', border: 'none',
                borderRadius: '8px', padding: '4px 10px', fontSize: '11px',
                cursor: 'pointer', fontFamily: "'Outfit', sans-serif", flexShrink: 0
              }}
            >Add</button>
          </div>
        )}
      </div>

      {/* Broadcast banner */}
      {broadcastMode && (
        <div style={{
          background: '#588157', color: 'white',
          padding: '10px 16px', fontSize: '12px', fontWeight: '500',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <span>Select patients to message</span>
          <button
            onClick={() => { setBroadcastMode(false); setSelectedForBroadcast([]); setBroadcastMessage(''); }}
            style={{ background: 'none', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer', padding: 0, lineHeight: 1 }}
          >✕</button>
        </div>
      )}

      {/* Contacts */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
        {broadcastMode ? (
          broadcastFiltered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
              No contacts found
            </div>
          ) : (
            broadcastFiltered.map(contact => {
              const name = contact.name || contactMap[contact.phone];
              const isSelected = selectedForBroadcast.includes(contact.phone);
              return (
                <div
                  key={contact.phone}
                  onClick={() => toggleBroadcastContact(contact.phone)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 16px', borderBottom: '0.5px solid #F1F5F0',
                    cursor: 'pointer', background: isSelected ? '#F0F4EE' : '#fff',
                    transition: 'background 0.15s'
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    border: isSelected ? 'none' : '1.5px solid #C5CAD2',
                    background: isSelected ? '#588157' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  {/* Avatar */}
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: getAvatarColor(contact.phone),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: '500', color: '#588157', flexShrink: 0
                  }}>
                    {getInitials(contact.phone, name)}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px', fontWeight: '500', color: '#2F3E46',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {name || contact.phone}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : showEmptyState ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
            {viewingArchived ? 'No archived conversations' : 'No active chats yet'}
          </div>
        ) : (
          filtered.map(contact => {
            const name = contactMap[contact.phone];
            const initials = getInitials(contact.phone, name);
            const preview = contact.latest?.body
              ? (contact.latest.direction === 'outbound' ? `You: ${contact.latest.body}` : contact.latest.body)
              : '';

            return (
              <div
                key={contact.phone}
                onClick={() => onSelectContact(contact.phone, name, viewingArchived)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px', borderBottom: '0.5px solid #F1F5F0',
                  cursor: 'pointer', background: '#fff', transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8F9F7'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                {/* Avatar */}
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: getAvatarColor(contact.phone),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '500', color: '#588157', flexShrink: 0
                }}>
                  {initials}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px', fontWeight: '500', color: '#2F3E46',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {name || contact.phone}
                  </div>
                  <div style={{
                    fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px'
                  }}>
                    {preview}
                  </div>
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                    {formatTime(contact.latest?.created_at)}
                  </div>
                  {contact.unreadCount > 0 && (
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: '#D6BD98', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '10px', fontWeight: '600', color: '#fff'
                    }}>
                      {contact.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Broadcast compose bar */}
      {broadcastMode && (
        <div style={{
          background: '#fff', borderTop: '0.5px solid #E2E8E1',
          padding: '12px 16px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
          flexShrink: 0
        }}>
          <textarea
            value={broadcastMessage}
            onChange={e => setBroadcastMessage(e.target.value.slice(0, 320))}
            placeholder="Type your message..."
            style={{
              width: '100%', background: '#F7F6F2', border: '0.5px solid #E2E8E1',
              borderRadius: '10px', padding: '10px 12px', fontSize: '16px',
              color: '#2F3E46', fontFamily: "'Outfit', sans-serif", outline: 'none',
              resize: 'none', boxSizing: 'border-box', height: '72px', marginBottom: '4px'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', color: '#94A3B8' }}>{broadcastMessage.length}/320</span>
            <button
              onClick={() => onBroadcast && onBroadcast(selectedForBroadcast, broadcastMessage)}
              disabled={selectedForBroadcast.length === 0 || !broadcastMessage.trim()}
              style={{
                background: selectedForBroadcast.length === 0 || !broadcastMessage.trim() ? '#E2E8E1' : '#588157',
                color: selectedForBroadcast.length === 0 || !broadcastMessage.trim() ? '#94A3B8' : 'white',
                border: 'none', borderRadius: '10px', padding: '8px 16px',
                fontSize: '12px', fontWeight: '600',
                cursor: selectedForBroadcast.length === 0 || !broadcastMessage.trim() ? 'not-allowed' : 'pointer',
                fontFamily: "'Outfit', sans-serif"
              }}
            >
              {selectedForBroadcast.length === 0 ? 'Select patients' : `Send to ${selectedForBroadcast.length}`}
            </button>
          </div>
        </div>
      )}

      {/* Archive toggle */}
      {!broadcastMode && (
        <div
          onClick={toggleArchived}
          style={{
            padding: '12px 16px', fontSize: '11px',
            color: viewingArchived ? '#588157' : '#94A3B8',
            textAlign: 'center', cursor: 'pointer',
            borderTop: '0.5px solid #E2E8E1',
            background: viewingArchived ? '#F0F4EE' : '#fff',
            flexShrink: 0, fontWeight: viewingArchived ? '600' : '400'
          }}
        >
          {viewingArchived ? '← Back to active conversations' : 'View archived →'}
        </div>
      )}
    </div>
  );
}

export default ContactsList;