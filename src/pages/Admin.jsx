import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'jameson@juniperrmt.com';

function relativeTime(ts) {
  if (!ts) return 'Never';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
}

function Admin({ onBack }) {
  const [authorized, setAuthorized] = useState(null);
  const [practitioners, setPractitioners] = useState([]);
  const [msgStats, setMsgStats] = useState({ total: 0, today: 0, week: 0, perUser: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== ADMIN_EMAIL) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
      await Promise.all([fetchPractitioners(), fetchMessages()]);
      setLoading(false);
    };
    init();
  }, []);

  const fetchPractitioners = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setPractitioners([]);
      return;
    }

    try {
      const response = await fetch('https://cub-bridge-api.vercel.app/api/health-check?type=admin-users', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const result = await response.json();
      setPractitioners(result.practitioners || []);
    } catch (err) {
      console.error('Failed to fetch practitioners:', err);
      setPractitioners([]);
    }
  };

  const fetchMessages = async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeek = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { count: total } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    const { count: today } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday);

    const { count: week } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfWeek);

    const { data: msgs } = await supabase
      .from('messages')
      .select('practitioner_id');

    const countMap = {};
    (msgs || []).forEach(m => {
      countMap[m.practitioner_id] = (countMap[m.practitioner_id] || 0) + 1;
    });

    setMsgStats({ total: total || 0, today: today || 0, week: week || 0, perUser: countMap });
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

  const fieldNoteStyle = {
    fontSize: '11px',
    color: '#94A3B8',
    marginTop: '6px',
    lineHeight: '1.5',
  };

  if (authorized === false) {
    if (typeof onBack === 'function') onBack();
    return null;
  }

  const noClinicNumber = practitioners.filter(p => !p.clinic_number);
  const billingIssues = practitioners.filter(p =>
    p.stripe_status !== 'active' &&
    p.trial_status !== 'active' &&
    p.trial_status !== 'trial'
  );

  const quickLinks = [
    { label: 'Sentry', url: 'https://cub-suite.sentry.io' },
    { label: 'Supabase', url: 'https://supabase.com/dashboard/project/rxykylhicqkxrlweyxhh' },
    { label: 'Vercel', url: 'https://vercel.com/cleanupbuddys-projects' },
    { label: 'Stripe', url: 'https://dashboard.stripe.com' },
  ];

  return (
    <div style={{
      height: '100%', overflowY: 'auto',
      background: '#F7F6F2', fontFamily: "'Outfit', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: '#fff', padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '0.5px solid #E2E8E1',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: '#588157',
          fontSize: '11px', fontWeight: '600', cursor: 'pointer',
          fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em'
        }}>‹ Back</button>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#2F3E46' }}>Admin</div>
        <div style={{ width: '40px' }} />
      </div>

      <div style={{ padding: '20px 16px', maxWidth: '700px', margin: '0 auto' }}>
        {loading ? (
          <p style={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center', marginTop: '40px' }}>
            Loading...
          </p>
        ) : (
          <>
            {/* Card 1 — Users */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                Users
                <span style={{ marginLeft: '8px', color: '#588157', fontWeight: '700' }}>
                  {practitioners.length}
                </span>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '320px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#F7F6F2' }}>
                      {['Name', 'Email', 'Profession', 'Stripe', 'Trial', 'Clinic #', 'Last Seen'].map(h => (
                        <th key={h} style={{
                          padding: '8px 12px', textAlign: 'left', fontSize: '10px',
                          fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase',
                          letterSpacing: '0.05em', whiteSpace: 'nowrap'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {practitioners.map((p, i) => (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAF9' }}>
                        <td style={{ padding: '8px 12px', color: '#2F3E46', whiteSpace: 'nowrap' }}>
                          {p.therapist_name || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748B', whiteSpace: 'nowrap' }}>
                          {p.user_email}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748B', whiteSpace: 'nowrap' }}>
                          {p.profession_type || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: '600', padding: '2px 7px',
                            borderRadius: '20px',
                            background: p.stripe_status === 'active' ? '#EAF3DE' : '#FFF3E0',
                            color: p.stripe_status === 'active' ? '#588157' : '#A0845C'
                          }}>
                            {p.stripe_status || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: '600', padding: '2px 7px',
                            borderRadius: '20px',
                            background: ['active', 'trial'].includes(p.trial_status) ? '#EAF3DE' : '#F1F5F9',
                            color: ['active', 'trial'].includes(p.trial_status) ? '#588157' : '#94A3B8'
                          }}>
                            {p.trial_status || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          {p.clinic_number ? '✓' : '✗'}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                          {relativeTime(p.last_seen_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card 2 — Message Activity */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>Message Activity</div>
              <div style={cardBodyStyle}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { label: 'All time', value: msgStats.total },
                    { label: 'Today', value: msgStats.today },
                    { label: 'This week', value: msgStats.week },
                  ].map(s => (
                    <div key={s.label} style={{
                      flex: 1, background: '#F7F6F2', borderRadius: '12px',
                      padding: '12px', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '22px', fontWeight: '600', color: '#588157' }}>{s.value}</div>
                      <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Per User</div>
                  {practitioners.map(p => {
                    const count = msgStats.perUser[p.id] || 0;
                    return (
                      <div key={p.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '7px 0', borderBottom: '0.5px solid rgba(47,62,70,0.06)'
                      }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#2F3E46' }}>{p.therapist_name || p.user_email}</div>
                          {p.therapist_name && <div style={{ fontSize: '11px', color: '#94A3B8' }}>{p.user_email}</div>}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#588157' }}>{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Card 3 — System Health */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>System Health</div>
              <div style={cardBodyStyle}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    No clinic number ({noClinicNumber.length})
                  </div>
                  {noClinicNumber.length === 0 ? (
                    <p style={fieldNoteStyle}>All practitioners have a clinic number.</p>
                  ) : noClinicNumber.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 0', fontSize: '12px', color: '#2F3E46'
                    }}>
                      <span style={{ color: '#A0845C' }}>⚠</span>
                      <span>{p.therapist_name || p.user_email}</span>
                      <span style={{ color: '#94A3B8', fontSize: '11px' }}>{p.user_email}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Billing issues ({billingIssues.length})
                  </div>
                  {billingIssues.length === 0 ? (
                    <p style={fieldNoteStyle}>No billing issues detected.</p>
                  ) : billingIssues.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 0', fontSize: '12px', color: '#2F3E46'
                    }}>
                      <span style={{ color: '#E05C5C' }}>⚠</span>
                      <span>{p.therapist_name || p.user_email}</span>
                      <span style={{ color: '#94A3B8', fontSize: '11px' }}>stripe: {p.stripe_status} · trial: {p.trial_status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 4 — Quick Links */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>Quick Links</div>
              <div style={{ padding: '8px 0' }}>
                {quickLinks.map(link => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', textDecoration: 'none',
                      borderBottom: '0.5px solid rgba(47,62,70,0.06)',
                      fontSize: '13px', color: '#2F3E46'
                    }}
                  >
                    <span>{link.label}</span>
                    <span style={{ color: '#94A3B8', fontSize: '12px' }}>→</span>
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Admin;
