'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getUnreadCount } from '@/lib/api/notifications';

const POLL_INTERVAL_MS = 30_000;

type BadgeNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

async function applyBadge(count: number) {
  const nav = navigator as BadgeNavigator;

  try {
    if (count > 0) await nav.setAppBadge?.(count);
    else await nav.clearAppBadge?.();
  } catch {
    // Badging isn't supported everywhere; ignore.
  }

  // Keep the service worker's counter in step with the real number, so the
  // next push while the app is closed continues from the right value.
  try {
    const cache = await caches.open('nexum-badge');
    await cache.put('/__badge', new Response(String(count)));
  } catch {
    // Cache Storage unavailable; ignore.
  }
}

/** Mirrors the unread notification count onto the installed app's icon. */
export function AppBadgeSync() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      applyBadge(0);
      return;
    }

    let cancelled = false;

    const sync = () => {
      getUnreadCount()
        .then((res) => {
          if (!cancelled) applyBadge(res.unreadCount);
        })
        .catch(() => {});
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };

    sync();
    const interval = setInterval(sync, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', sync);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', sync);
    };
  }, [user, isLoading]);

  return null;
}
