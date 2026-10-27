'use client';

import { useEffect, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$*+=<>?/';
const TICK_MS = 45;

/** One frame of the effect: letters before `revealed` are final, the rest are random glyphs. */
export function scrambleFrame(target: string, revealed: number, random: () => number = Math.random): string {
  let out = '';

  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    out += ch === ' ' || i < revealed ? ch : GLYPHS[Math.floor(random() * GLYPHS.length)];
  }

  return out;
}

/**
 * Text that starts as random characters and settles into `target`, one
 * letter at a time from the left. Restarts whenever `target` changes.
 */
export function useScrambleText(target: string, options: { durationMs?: number; delayMs?: number } = {}) {
  const { durationMs = 1100, delayMs = 0 } = options;

  // Identical on the server and the first client render, so hydration matches.
  const [text, setText] = useState(() => target.replace(/[^ ]/g, '·'));

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      queueMicrotask(() => setText(target));
      return;
    }

    let frame = 0;
    let lastTick = 0;
    const start = performance.now() + delayMs;

    const step = (now: number) => {
      const progress = Math.min(Math.max((now - start) / durationMs, 0), 1);

      if (progress >= 1) {
        setText(target);
        return;
      }

      if (now - lastTick >= TICK_MS) {
        lastTick = now;
        setText(scrambleFrame(target, Math.floor(progress * target.length)));
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, delayMs]);

  return text;
}