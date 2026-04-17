export async function setUnreadBadge(count) {
  try {
    if (!('setAppBadge' in navigator) || !('clearAppBadge' in navigator)) return;

    if (!count || count <= 0) {
      await navigator.clearAppBadge();
      return;
    }

    await navigator.setAppBadge(count);
  } catch (err) {
    console.error('Badge update error:', err);
  }
}