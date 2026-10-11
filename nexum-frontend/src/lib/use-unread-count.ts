'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { getUnreadCount } from './api/notifications';

const POLL_INTERVAL_MS = 30_000;

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    let cancelled = false;
    const fetchCount = () => {
      getUnreadCount()
        .then((res) => !cancelled && setCount(res.unreadCount))
        .catch(() => {});
    };

    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  return count;
}