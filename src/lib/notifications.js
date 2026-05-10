import { supabase } from './supabase';

export async function registerPushNotifications() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: false, reason: 'unsupported' };
    }

    const registration = await navigator.serviceWorker.register('/sw.js');

    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return { ok: false, reason: 'denied' };
    }

    let subscription = await registration.pushManager.getSubscription();

    if (subscription && subscription.expirationTime && subscription.expirationTime < Date.now()) {
      await subscription.unsubscribe();
      subscription = null;
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY)
      });
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { ok: false, reason: 'no-session' };
    }

    const { data: profile } = await supabase
      .from('practitioners')
      .select('push_subscription')
      .eq('id', session.user.id)
      .maybeSingle();

    const storedEndpoint = profile?.push_subscription?.endpoint;
    const currentEndpoint = subscription.toJSON().endpoint;

    if (storedEndpoint === currentEndpoint) {
      return { ok: true, subscription };
    }

    const { error } = await supabase
      .from('practitioners')
      .update({ push_subscription: subscription.toJSON() })
      .eq('id', session.user.id);

    if (error) {
      console.error('Push subscription save error:', error);
      return { ok: false, reason: 'save-failed' };
    }

    return { ok: true, subscription };
  } catch (err) {
    console.error('Push registration error:', err);
    return { ok: false, reason: 'error', error: err.message };
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}