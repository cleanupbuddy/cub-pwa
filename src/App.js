import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Paywall from './pages/Paywall';
import Onboarding from './pages/Onboarding';
import BCGate from './components/BCGate';
import Admin from './pages/Admin';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [startupError, setStartupError] = useState('');
  const [hasResolvedAccess, setHasResolvedAccess] = useState(false);
  const [confirmingSubscription, setConfirmingSubscription] = useState(false);
  const [subscriptionConfirmed, setSubscriptionConfirmed] = useState(false);
  const isResolvingRef = useRef(false);
  const isSubscribedRef = useRef(false);

  const checkSubscription = async (email) => {
    try {
      setStartupError('');

      const { data: profile, error } = await supabase
        .from('practitioners')
        .select('stripe_status, trial_status, clinic_number, therapist_name')
        .eq('user_email', email)
        .maybeSingle();

      if (error) throw error;
      if (!profile) return null;

      const subscribed =
        profile.stripe_status === 'active' ||
        profile.trial_status === 'active' ||
        profile.trial_status === 'trial';

      const onboarding = !profile.clinic_number || !profile.therapist_name;

      return { subscribed, onboarding };
    } catch (err) {
      console.error('Subscription check error:', err);
      return null;
    }
  };

  const resolveAppAccess = async (targetSession = null) => {
    if (isResolvingRef.current) return false;
    isResolvingRef.current = true;

    try {
      const activeSession =
        targetSession ??
        (await supabase.auth.getSession()).data.session;

      if (!activeSession) {
        setSession(null);
        setUserEmail('');
        setIsSubscribed(false);
        isSubscribedRef.current = false;
        setNeedsOnboarding(false);
        setLoading(false);
        setHasResolvedAccess(true);
        return true;
      }

      const email = activeSession.user.email;
      const result = await checkSubscription(email);

      setSession(activeSession);
      setUserEmail(email);
      if (result) {
        setIsSubscribed(result.subscribed);
        isSubscribedRef.current = result.subscribed;
        setNeedsOnboarding(result.onboarding);
      }
      setLoading(false);
      setHasResolvedAccess(true);

      return true;
    } catch (err) {
      console.error('resolveAppAccess error:', err);
      setLoading(false);
      setHasResolvedAccess(true);
      return false;
    } finally {
      isResolvingRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const bootstrapTimeout = setTimeout(() => {
      console.log('⏱️ Force exiting bootstrap');
      setIsBootstrapping(false);
    }, 8000);

    const bootstrap = async () => {
      try {
        await resolveAppAccess();
        if (mounted) {
          clearTimeout(bootstrapTimeout);
          setIsBootstrapping(false);
        }
      } catch (err) {
        console.error('Bootstrap error (attempt 1):', err);
        if (!mounted) return;
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!mounted) return;
        try {
          await resolveAppAccess();
          if (mounted) {
            clearTimeout(bootstrapTimeout);
            setIsBootstrapping(false);
          }
        } catch (retryErr) {
          console.error('Bootstrap error (attempt 2):', retryErr);
          if (mounted) {
            clearTimeout(bootstrapTimeout);
            setStartupError('CUB Line is taking longer than expected to load.');
            setLoading(false);
            setIsBootstrapping(false);
            setHasResolvedAccess(true);
          }
        }
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const subscribedParam = urlParams.get('subscribed');
    const cancelledParam = urlParams.get('cancelled');

    if (subscribedParam === 'true') {
      setConfirmingSubscription(true);
      window.history.replaceState({}, '', window.location.pathname);

      let attempts = 0;
      const maxAttempts = 6;
      const pollInterval = setInterval(async () => {
        attempts++;
        await resolveAppAccess();
        if (isSubscribedRef.current) {
          clearInterval(pollInterval);
          setSubscriptionConfirmed(true);
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setConfirmingSubscription(false);
        }
      }, 1000);
    } else if (cancelledParam === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
    }

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      try {
        const resolved = await resolveAppAccess(nextSession);
        if (resolved) {
          clearTimeout(bootstrapTimeout);
          setIsBootstrapping(false);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        clearTimeout(bootstrapTimeout);
        setStartupError('There was a problem loading your account.');
        setLoading(false);
        setIsBootstrapping(false);
        setHasResolvedAccess(true);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(bootstrapTimeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let hiddenAt = null;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        const elapsed = hiddenAt ? Date.now() - hiddenAt : 0;
        // If backgrounded for more than 15 seconds, force a clean reload
        // This is the most reliable fix for dead WebSocket connections on iOS
        if (elapsed > 15000) {
          window.location.reload();
          return;
        }
        // For short backgrounds, just refresh the auth session
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) supabase.auth.refreshSession().catch(() => {});
        }).catch(() => {});
      }
    };

    // pageshow catches iOS back-forward cache restores
    const handlePageShow = (e) => {
      if (e.persisted) {
        window.location.reload();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  if (confirmingSubscription) return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: '#2F3E46', zIndex: 500,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif", padding: '32px'
    }}>
      <svg width="56" height="56" viewBox="0 0 120 120" style={{ marginBottom: '24px' }}>
        <rect x="0" y="0" width="120" height="120" rx="22" fill="#EAF3DE" />
        <text x="60" y="95" fontFamily="Georgia, serif" fontSize="36" fontWeight="700" fill="#526659" textAnchor="middle" letterSpacing="-0.5">cub</text>
      </svg>
      <h2 style={{ color: '#EAF3DE', fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
        You're in!
      </h2>
      <p style={{ color: '#9CAF88', fontSize: '13px', textAlign: 'center', marginBottom: subscriptionConfirmed ? '24px' : '0' }}>
        {subscriptionConfirmed ? "Your subscription is confirmed. Let's get your clinic line set up." : 'Confirming your subscription...'}
      </p>
      {subscriptionConfirmed && (
        <button
          onClick={() => { setConfirmingSubscription(false); setSubscriptionConfirmed(false); }}
          style={{
            padding: '13px 24px', background: '#588157', border: 'none', borderRadius: '12px',
            fontSize: '12px', fontWeight: '600', color: 'white', cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em'
          }}
        >
          Continue to setup →
        </button>
      )}
    </div>
  );

  if (isBootstrapping) return (
    <>
      <style>{`
        @keyframes cub-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#F7F6F2'
      }}>
        <div style={{
          color: '#588157',
          fontSize: '14px',
          fontFamily: "'Outfit', sans-serif",
          animation: 'cub-pulse 1.8s ease-in-out infinite'
        }}>
          Opening CUB Line...
        </div>
      </div>
    </>
  );

  if (startupError && !loading) return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#F7F6F2',
      padding: '24px'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '320px',
        fontFamily: "'Outfit', sans-serif"
      }}>
        <div style={{
          color: '#2F3E46',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '8px'
        }}>
          Trouble loading CUB Line
        </div>
        <div style={{
          color: '#6B7280',
          fontSize: '13px',
          lineHeight: '1.5',
          marginBottom: '16px'
        }}>
          {startupError}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#588157',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '10px 16px',
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif"
          }}
        >
          Reload app
        </button>
      </div>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/*" element={
          !session ? <Navigate to="/login" /> :
            <BCGate userEmail={session.user.email}>
              {!hasResolvedAccess ? null :
                !isSubscribed ?
                  <Paywall
                    userEmail={userEmail}
                    onReturnToLogin={() => {
                      window.location.href = '/login';
                    }}
                  /> :
                  needsOnboarding ?
                    <Onboarding userEmail={userEmail} onComplete={(wantsTour) => {
                      setNeedsOnboarding(false);
                      window.sessionStorage.setItem('cub_wants_tour', wantsTour ? 'true' : 'false');
                    }} /> :
                    showAdmin
                      ? <Admin onBack={() => setShowAdmin(false)} />
                      : <Dashboard onAdmin={() => setShowAdmin(true)} />
              }
            </BCGate>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
