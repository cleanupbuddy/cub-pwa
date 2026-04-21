export async function setUnreadBadge(count) {
  try {
    const unreadCount = Number(count || 0);

    if ('setAppBadge' in navigator && unreadCount > 0) {
      await navigator.setAppBadge(unreadCount);
      return;
    }

    if ('clearAppBadge' in navigator) {
      await navigator.clearAppBadge();
    }
  } catch (err) {
    console.error('Badge update error:', err);
  }
}