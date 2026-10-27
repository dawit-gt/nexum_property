'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useScrambleText } from '@/lib/use-scramble-text';
import { cn } from '@/lib/utils';

const SEEN_KEY = 'nexum-splash-seen';
const MIN_VISIBLE_MS = 1800;
const REDUCED_MOTION_MS = 500;
const SLOW_AFTER_MS = 6000;
const FADE_MS = 500;
const MESSAGE_EVERY_MS = 1100;

const MESSAGES = [
  'Warming up the engines',
  'Counting the rooms',
  'Dusting off the lease files',
  'Checking the keys',
  'Syncing your workspace',
  'Polishing the doorknobs',
  'Almost there',
];

function pickDifferent(previous: string) {
  const others = MESSAGES.filter((m) => m !== previous);
  return others[Math.floor(Math.random() * others.length)];
}

/**
 * Full-screen welcome shown while the app starts. Plays its full animation
 * the first time in a browser session, then only covers the short wait for
 * the login check. It stays up for as long as that check takes, so a sleeping
 * server never shows a half-loaded page.
 */
export function AppSplash() {
  const { isLoading } = useAuth();

  const [minElapsed, setMinElapsed] = useState(false);
  const [slow, setSlow] = useState(false);
  const [gone, setGone] = useState(false);
  const [message, setMessage] = useState(MESSAGES[0]);

  const ready = !isLoading && minElapsed;

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1';
    } catch {
      // storage unavailable (private mode): just play the animation
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = seen ? 0 : reduced ? REDUCED_MOTION_MS : MIN_VISIBLE_MS;

    const timer = setTimeout(() => setMinElapsed(true), wait);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setMessage((prev) => pickDifferent(prev)), MESSAGE_EVERY_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;

    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // ignore
    }

    const timer = setTimeout(() => setGone(true), FADE_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  const title = useScrambleText('NEXUM', { durationMs: 1000 });
  const tagline = useScrambleText(message, { durationMs: 480 });

  if (gone) return null;

  return (
    <div
      role="status"
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white px-6 text-center transition-opacity ease-out',
        ready ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <span className="sr-only">Loading Nexum</span>

      <div className="splash-float">
        <Image src="/logo.png" alt="" width={72} height={72} priority />
      </div>

      <p
        aria-hidden="true"
        className="mt-6 text-3xl font-bold tracking-[0.35em] text-slate-900"
        style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
      >
        {title}
      </p>

      <p
        aria-hidden="true"
        className="mt-3 h-5 text-sm text-slate-500"
        style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
      >
        {tagline}
      </p>

      <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className="splash-bar h-full w-1/3 rounded-full bg-[#c9a227]" />
      </div>

      <p className={cn('mt-6 max-w-xs text-xs text-slate-400 transition-opacity duration-500', slow && !ready ? 'opacity-100' : 'opacity-0')}>
        Still starting up. The server may be waking from sleep, which can take up to a minute the first time.
      </p>
    </div>
  );
}