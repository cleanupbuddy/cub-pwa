import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Paywall from './pages/Paywall';
import Onboarding from './pages/Onboarding';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [paywallSkipped, setPaywallSkipped] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const getSession = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) return session;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return null;
    };

    getSession().then(async (session) => {
      setSession(session);
      if (session) {
        setUserEmail(session.user.email);
        await checkSubscription(session.user.email);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await checkSubscription(session.user.email);
        setUserEmail(session.user.email);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) window.location.reload();
    }, 10000);
    return () => clearTimeout(timeout);
  }, [loading]);
  
  const checkSubscription = async (email) => {
    try {
      const { data: profile } = await supabase
        .from('practitioners')
        .select('stripe_status, trial_status, clinic_number, therapist_name')
        .eq('user_email', email)
        .maybeSingle();

      console.log('Profile check:', email, profile);

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
      setIsSubscribed(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F6F2' }}>
      <div style={{ color: '#9CAF88', fontSize: '14px', fontFamily: 'sans-serif' }}>Loading...</div>
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