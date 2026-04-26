import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { setUnreadBadge } from '../lib/badge';

function ContactsList({ onSelectContact, clinicNumber, onArchiveChange, viewingArchived, refreshTrigger, currentUserId }) {
  const [contacts, setContacts] = useState([]);
  const [contactMap, setContactMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    let channel;

    const setupContactsSubscription = async () => {
      if (!currentUserId || !clinicNumber) return;

      await loadContacts(viewingArchived);

      channel = supabase.channel('contacts:messages')
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
      if (channel) supabase.removeChannel(channel);
    };
  }, [viewingArchived, refreshTrigger, currentUserId, clinicNumber]);

  const loadContacts = async (archived = viewingArchived) => {
    setLoading(true);

    const fallbackTimeout = setTimeout(() => {
      console.warn('Contacts load timed out');
      setLoading(false);
    }, 5000);

    try {
      if (!currentUserId || !clinicNumber) {
        setContacts([]);
        setContactMap({});
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

      setContacts(unique);

      const totalUnread = unique.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      await setUnreadBadge(totalUnread);
    } catch (err) {
      console.error('Load contacts error:', err);
      setContacts([]);
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

  const filtered = contacts.filter(c => {
    const name = contactMap[c.phone] || c.phone;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const showEmptyState = !loading && filtered.length === 0;

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
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            style={{
              width: '30px', height: '30px', background: '#588157',
              borderRadius: '50%', border: 'none', color: 'white',
              fontSize: '18px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}
          >+</button>
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

      {/* Contacts */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
        {showEmptyState ? (
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

      {/* Archive toggle */}
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
    </div>
  );
}

export default ContactsList;