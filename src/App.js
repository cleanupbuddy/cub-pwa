import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Paywall from './pages/Paywall';
import Onboarding from './pages/Onboarding';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true); // keep for now if already used elsewhere
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [paywallSkipped, setPaywallSkipped] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [startupError, setStartupError] = useState('');

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const currentSession = data.session;

        if (!mounted) return;

        setSession(currentSession);

        if (!currentSession) {
          setUserEmail('');
          setIsSubscribed(false);
          setNeedsOnboarding(false);
          setLoading(false);
          setIsBootstrapping(false);
          return;
        }

        const email = currentSession.user.email;
        setUserEmail(email);
        await checkSubscription(email);
      } catch (err) {
        console.error('Bootstrap error:', err);
        if (mounted) {
          setStartupError('CUB Line is taking longer than expected to load.');
          setLoading(false);
          setIsBootstrapping(false);
        }
      }
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (!session) {
        setUserEmail('');
        setIsSubscribed(false);
        setNeedsOnboarding(false);
        setLoading(false);
        return;
      }

      try {
        const email = session.user.email;
        setUserEmail(email);
        setLoading(true);
        await checkSubscription(email);
      } catch (err) {
        console.error('Auth state change error:', err);
        setStartupError('There was a problem loading your account.');
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const currentSession = data.session;
        setSession(currentSession);

        if (!currentSession) {
          setUserEmail('');
          setIsSubscribed(false);
          setNeedsOnboarding(false);
          return;
        }

        const email = currentSession.user.email;
        setUserEmail(email);
        await checkSubscription(email);
      } catch (err) {
        console.error('Resume recovery error:', err);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const checkSubscription = async (email) => {
    try {
      setStartupError('');

      const { data: profile, error } = await supabase
        .from('practitioners')
        .select('stripe_status, trial_status, clinic_number, therapist_name')
        .eq('user_email', email)
        .maybeSingle();

      if (error) throw error;

      if (
        profile?.stripe_status === 'active' ||
        profile?.trial_status === 'active' ||
        profile?.trial_status === 'trial'
      ) {
        setIsSubscribed(true);
      } else {
        setIsSubscribed(false);
      }

      if (!profile || !profile.clinic_number || !profile.therapist_name) {
        setNeedsOnboarding(true);
      } else {
        setNeedsOnboarding(false);
      }
    } catch (err) {
      console.error('Subscription check error:', err);
      setStartupError('There was a problem loading your workspace.');
      setIsSubscribed(true);
    }
  };

  if (isBootstrapping) return (
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
        fontFamily: "'Outfit', sans-serif"
      }}>
        Opening CUB Line...
      </div>
    </div>
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
            !isSubscribed && !paywallSkipped ?
              <Paywall userEmail={userEmail} onSkip={() => setPaywallSkipped(true)} /> :
              needsOnboarding ?
                <Onboarding userEmail={userEmail} onComplete={() => setNeedsOnboarding(false)} /> :
                <Dashboard />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;