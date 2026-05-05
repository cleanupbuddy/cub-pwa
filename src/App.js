import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Paywall from './pages/Paywall';
import Onboarding from './pages/Onboarding';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [paywallSkipped, setPaywallSkipped] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [startupError, setStartupError] = useState('');
  const [hasResolvedAccess, setHasResolvedAccess] = useState(false);
  const isResolvingRef = useRef(false);

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
            !hasResolvedAccess ? null :
              !isSubscribed && !paywallSkipped ?
                <Paywall
                  userEmail={userEmail}
                  onSkip={() => setPaywallSkipped(true)}
                  onReturnToLogin={() => {
                    window.location.href = '/login';
                  }}
                /> :
                needsOnboarding ?
                  <Onboarding userEmail={userEmail} onComplete={() => setNeedsOnboarding(false)} /> :
                  <Dashboard />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
