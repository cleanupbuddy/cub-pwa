import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ContactsList from '../components/ContactsList';
import ChatWindow from '../components/ChatWindow';
import Settings from '../pages/Settings';
import WelcomeSurvey from '../components/WelcomeSurvey';
import { registerPushNotifications } from '../lib/notifications';
import FeedbackPrompt from '../components/FeedbackPrompt';
import OnboardingTour from '../components/OnboardingTour';
import ReportIssue from '../components/ReportIssue';
import ShareFeedback from '../components/ShareFeedback';

function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [status, setStatus] = useState('active');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [viewingArchived, setViewingArchived] = useState(false);
  const [refreshContacts, setRefreshContacts] = useState(0);
  const [wakeRefresh, setWakeRefresh] = useState(0);
  const [feedbackDay, setFeedbackDay] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showShareFeedback, setShowShareFeedback] = useState(false);

  useEffect(() => {
    loadProfile();

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (!isStandalone) setShowInstallBanner(true);

    let lastHidden = null;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        lastHidden = Date.now();
        return;
      }

      if (document.visibilityState === 'visible') {
        const timeAsleep = lastHidden ? Date.now() - lastHidden : 0;

        if (timeAsleep > 60000) {
          await loadProfile();
        }

        setRefreshContacts(prev => prev + 1);
        setWakeRefresh(prev => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleSwitchAccount = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      window.location.replace('/login?switch=true');
    } catch (err) {
      window.location.replace('/login?switch=true');
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('practitioners')
        .select('*')
        .eq('user_email', session.user.email)
        .maybeSingle();

      setProfile(profile);
      if (profile?.current_status) setStatus(profile.current_status);
      if (profile?.clinic_number && !profile?.survey_completed) {
        setShowSurvey(true);
      }

      if (profile?.clinic_number && !profile?.tour_completed) {
        setShowTour(true);
      }

      // Check feedback prompts
      if (profile?.trial_start_date && profile?.clinic_number) {
        const daysSinceStart = Math.floor(
          (new Date() - new Date(profile.trial_start_date)) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceStart >= 3 && !profile?.feedback_day3_completed) {
          setFeedbackDay(3);
        } else if (daysSinceStart >= 14 && !profile?.feedback_day14_completed) {
          setFeedbackDay(14);
        } else if (daysSinceStart >= 25 && !profile?.feedback_day25_completed) {
          setFeedbackDay(25);
        }
      }

      // Register push notifications
      if (profile?.clinic_number) {
        registerPushNotifications().then(subscription => {
          if (subscription) {
            console.log('Push notifications enabled!');
          }
        });
      }
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setShowStatusMenu(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSurveyComplete = async () => {
    setShowSurvey(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('practitioners')
          .update({ survey_completed: true })
          .eq('user_email', session.user.email);
      }
    } catch (err) {
      console.error('Survey complete error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      console.error('Sign out error:', err);
      window.location.reload();
    }
  };

  const handleSelectContact = (phone, name, isArchived = false) => {
    setSelectedContact({ phone, name, isArchived });
  };

  const updateStatus = async (newStatus) => {
    setStatus(newStatus);
    setShowStatusMenu(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('practitioners')
          .update({ current_status: newStatus })
          .eq('id', session.user.id);
      }
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const statusColor = status === 'active' ? '#9CAF88' : status === 'session' ? '#D6BD98' : '#64748B';
  const [isMobile, setIsMobile] = useState(
    window.matchMedia('(max-width: 767px)').matches ||
    /iPhone|iPod/.test(navigator.userAgent)
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');

    const updateMobile = () => {
      setIsMobile(
        mediaQuery.matches || /iPhone|iPod/.test(navigator.userAgent)
      );
    };

    updateMobile();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateMobile);
    } else {
      mediaQuery.addListener(updateMobile);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateMobile);
      } else {
        mediaQuery.removeListener(updateMobile);
      }
    };
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F6F2' }}>
      <div style={{ color: '#9CAF88', fontSize: '14px', fontFamily: 'sans-serif' }}>Loading...</div>
    </div>
  );

  return (
    <div style={{
      height: '100dvh',
      minHeight: '100dvh',
      background: '#F7F6F2',
      fontFamily: "'Outfit', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>

      {showInstallBanner && (
        <div style={{
          background: '#2F3E46', color: 'white',
          padding: '10px 16px', fontSize: '11px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '12px',
          lineHeight: '1.5', flexShrink: 0
        }}>
          <span>
            🌿 For the best experience —
            <strong> Add CUB to your Home Screen</strong> via Safari Share → Add to Home Screen
          </span>
          <button
            onClick={() => setShowInstallBanner(false)}
            style={{
              background: 'none', border: 'none', color: '#9CAF88',
              fontSize: '16px', cursor: 'pointer', flexShrink: 0,
              lineHeight: 1, padding: 0
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Welcome Survey */}
      {showSurvey && (
        <WelcomeSurvey
          onComplete={handleSurveyComplete}
        />
      )}

      {showTour && (
        <OnboardingTour
          userEmail={profile?.user_email}
          onComplete={() => setShowTour(false)}
        />
      )}

      {feedbackDay && (
        <FeedbackPrompt
          day={feedbackDay}
          userEmail={profile?.user_email}
          onComplete={() => {
            setFeedbackDay(null);
            loadProfile();
          }}
          onDismiss={() => setFeedbackDay(null)}
        />
      )}

      {showShareFeedback && (
        <ShareFeedback
          userEmail={profile?.user_email}
          onClose={() => setShowShareFeedback(false)}
        />
      )}

      {showReportIssue && (
        <ReportIssue
          userEmail={profile?.user_email}
          onClose={() => setShowReportIssue(false)}
        />
      )}

      {/* Header */}
      <div style={{
        background: '#fff',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '0.5px solid #E2E8E1',
        flexShrink: 0,
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* Status dot */}
          <div
            style={{
              width: '9px', height: '9px', borderRadius: '50%',
              background: statusColor, border: '1.5px solid #fff',
              boxShadow: `0 0 0 1.5px ${statusColor}`,
              flexShrink: 0
            }}
          />

          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#2F3E46' }}>
              {profile?.therapist_name || 'CUB Practitioner'}
              {profile?.profession_type ? ` · ${profile.profession_type}` : ''}
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8' }}>
              {profile?.clinic_name || 'Loading...'}
            </div>
          </div>
        </div>

        {/* Hamburger button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowStatusMenu(!showStatusMenu);
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            alignItems: 'center', gap: '4px', padding: '4px', width: '32px', height: '32px'
          }}
        >
          <span style={{ width: '16px', height: '1.5px', background: '#588157', borderRadius: '2px', display: 'block' }}></span>
          <span style={{ width: '16px', height: '1.5px', background: '#588157', borderRadius: '2px', display: 'block' }}></span>
          <span style={{ width: '16px', height: '1.5px', background: '#588157', borderRadius: '2px', display: 'block' }}></span>
        </button>

        {/* Hamburger dropdown */}
        {showStatusMenu && (
          <div style={{
            position: 'absolute', top: '52px', right: '12px',
            background: '#fff', border: '0.5px solid #E2E8E1',
            borderRadius: '12px', padding: '6px', width: '180px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)', zIndex: 100
          }}>
            {[
              { value: 'active', label: 'Active', color: '#9CAF88' },
              { value: 'session', label: 'In Session', color: '#D6BD98' },
              { value: 'off', label: 'Off Duty', color: '#64748B' }
            ].map(s => (
              <div
                key={s.value}
                onClick={() => updateStatus(s.value)}
                style={{
                  padding: '9px 12px', fontSize: '12px', color: '#2F3E46',
                  borderRadius: '8px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '8px',
                  background: status === s.value ? '#F0F4EE' : 'transparent'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F7F6F2'}
                onMouseLeave={e => e.currentTarget.style.background = status === s.value ? '#F0F4EE' : 'transparent'}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }}></div>
                {s.label}
              </div>
            ))}

            <div style={{ height: '0.5px', background: '#E2E8E1', margin: '4px 0' }} />

            <div
              onClick={() => {
                setShowStatusMenu(false);
                handleSwitchAccount();
              }}
              style={{
                padding: '9px 12px', fontSize: '12px', color: '#2F3E46',
                borderRadius: '8px', cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F7F6F2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Switch Account
            </div>

            <div style={{ height: '0.5px', background: '#E2E8E1', margin: '4px 0' }} />

            <div
              onClick={() => { setShowStatusMenu(false); setShowSettings(true); }}
              style={{
                padding: '9px 12px', fontSize: '12px', color: '#2F3E46',
                borderRadius: '8px', cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F7F6F2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Settings
            </div>

            <div style={{ height: '0.5px', background: '#E2E8E1', margin: '4px 0' }} />

            <div
              onClick={() => { setShowStatusMenu(false); window.open('https://getcubsuite.com/#faq', '_blank'); }}
              style={{
                padding: '9px 12px', fontSize: '12px', color: '#2F3E46',
                borderRadius: '8px', cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F7F6F2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Help & FAQ
            </div>

            <div
              onClick={() => { setShowStatusMenu(false); setShowShareFeedback(true); }}
              style={{
                padding: '9px 12px', fontSize: '12px', color: '#2F3E46',
                borderRadius: '8px', cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F7F6F2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Share Feedback
            </div>

            <div
              onClick={() => { setShowStatusMenu(false); setShowReportIssue(true); }}
              style={{
                padding: '9px 12px', fontSize: '12px', color: '#2F3E46',
                borderRadius: '8px', cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F7F6F2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Report an Issue
            </div>

            <div style={{ height: '0.5px', background: '#E2E8E1', margin: '4px 0' }} />

            <div
              onClick={() => { setShowStatusMenu(false); handleSignOut(); }}
              style={{
                padding: '9px 12px', fontSize: '12px', color: '#94A3B8',
                borderRadius: '8px', cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F7F6F2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Sign Out
            </div>
          </div>
        )}
      </div>

      {/* Settings or Split view */}
      {showSettings ? (
        <Settings
          onBack={() => setShowSettings(false)}
          profile={profile}
          onProfileUpdate={loadProfile}
        />
      ) : (

        <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          flexDirection: isMobile ? 'column' : 'row'
        }}>

          {/* Left — Contacts list */}
          {(!isMobile || !selectedContact) && (
            <div style={{
              width: isMobile ? '100%' : '320px',
              minWidth: isMobile ? '100%' : '320px',
              borderRight: isMobile ? 'none' : '0.5px solid #E2E8E1',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: '#fff'
            }}>

              <ContactsList
                key="contacts-list"
                onSelectContact={handleSelectContact}
                clinicNumber={profile?.clinic_number}
                selectedPhone={selectedContact?.phone}
                onArchiveChange={setViewingArchived}
                viewingArchived={viewingArchived}
                refreshTrigger={refreshContacts}
              />
            </div>
          )}

          {/* Right — Chat window */}
          {(!isMobile || selectedContact) && (
            <div style={{
              flex: 1,
              width: isMobile ? '100%' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: '#FDFDFD'
            }}>

              {selectedContact ? (
                <ChatWindow
                  contact={selectedContact}
                  clinicNumber={profile?.clinic_number}
                  therapistName={profile?.therapist_name}
                  clinicName={profile?.clinic_name}
                  practitionerNumber={profile?.practitioner_phone}
                  isArchivedView={selectedContact?.isArchived}
                  refreshTrigger={wakeRefresh}
                  onArchived={() => setTimeout(() => setRefreshContacts(prev => prev + 1), 500)}
                  onRead={() => setRefreshContacts(prev => prev + 1)}
                  onBack={() => {
                    setSelectedContact(null);
                    setTimeout(() => setViewingArchived(false), 300);
                  }}
                />
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: '12px'
                }}>
                  <svg width="48" height="48" viewBox="0 0 120 120">
                    <rect x="0" y="0" width="120" height="120" rx="22" fill="#EAF3DE" />
                    <text x="60" y="95" fontFamily="Georgia, serif" fontSize="36" fontWeight="700" fill="#526659" textAnchor="middle" letterSpacing="-0.5">cub</text>
                  </svg>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#2F3E46', marginBottom: '4px' }}>
                      Select a conversation
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                      Choose a patient from the list to start messaging
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;