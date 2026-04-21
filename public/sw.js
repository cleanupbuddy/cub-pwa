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
    try {
      const unreadCount = Number(data.unreadCount || 1);

      if (self.registration.setAppBadge) {
        if (unreadCount > 0) {
          await self.registration.setAppBadge(unreadCount);
        } else if (self.registration.clearAppBadge) {
          await self.registration.clearAppBadge();
        }
      }
    } catch (err) {
      console.error('SW badge error:', err);
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