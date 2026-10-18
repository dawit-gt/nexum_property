'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getAvatarUrl } from '@/lib/api/profile';
import { cn } from '@/lib/utils';

// Signed URLs last 60 minutes on the server; refresh a little earlier.
const CACHE_MS = 50 * 60 * 1000;
const cache = new Map<string, { url: string; expiresAt: number }>();

interface UserAvatarProps {
  size?: number;
  className?: string;
}

/** The signed-in user's photo, or their initials when they have none. */
export function UserAvatar({ size = 32, className }: UserAvatarProps) {
  const { user } = useAuth();
  const path = user?.avatarUrl ?? null;
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;

    const hit = cache.get(path);
    if (hit && hit.expiresAt > Date.now()) {
      queueMicrotask(() => setUrl(hit.url));
      return;
    }

    let cancelled = false;

    getAvatarUrl()
      .then(({ url: fresh }) => {
        if (cancelled || !fresh) return;
        cache.set(path, { url: fresh, expiresAt: Date.now() + CACHE_MS });
        setUrl(fresh);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [path]);

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-600',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
    >
      {path && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Profile photo" className="size-full object-cover" />
      ) : (
        initials || '?'
      )}
    </span>
  );
}