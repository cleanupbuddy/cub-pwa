export async function setUnreadBadge(count) {
  try {
    const unreadCount = Number(count || 0);

    // iOS / modern browsers
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        await navigator.setAppBadge(unreadCount);
      } else if ('clearAppBadge' in navigator) {
        await navigator.clearAppBadge();
      }
      return;
    }

    // fallback (older environments)
    if ('clearAppBadge' in navigator) {
      await navigator.clearAppBadge();
    }
  } catch (err) {
    console.error('Badge update error:', err);
  }
}