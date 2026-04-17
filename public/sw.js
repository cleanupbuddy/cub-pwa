// CUB Service Worker — Push Notifications

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'New patient message';
  const options = {
    body: data.body || 'Open CUB Line to view it.',
    icon: '/icon192.png',
    badge: '/icon192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };

  event.waitUntil((async () => {
    if ('setAppBadge' in navigator) {
      try {
        const unreadCount = Number(data.unreadCount || 1);
        await navigator.setAppBadge(unreadCount);
      } catch (err) {
        console.error('SW badge error:', err);
      }
    }

    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});