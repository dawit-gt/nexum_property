'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleRow } from '@/components/ui/toggle-row';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/api/notifications';
import {
  disconnectTelegram,
  getTelegramStatus,
  startTelegramConnect,
} from '@/lib/api/telegram';
import type {
  NotificationPreference,
  TelegramConnectLink,
  TelegramStatus,
} from '@/types/notification';

type EditableKey = Exclude<keyof NotificationPreference, 'inAppEnabled'>;

const POLL_MS = 3000;

export function NotificationPreferencesCard() {
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);
  const [link, setLink] = useState<TelegramConnectLink | null>(null);
  const [waitingUntil, setWaitingUntil] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([getNotificationPreferences(), getTelegramStatus()]);
      setPrefs(p);
      setTelegram(t);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // While the tenant is in Telegram pressing Start, poll until the bot confirms.
  useEffect(() => {
    if (!waitingUntil) return;

    const interval = setInterval(async () => {
      try {
        const status = await getTelegramStatus();
        if (status.connected) {
          setTelegram(status);
          setLink(null);
          setWaitingUntil(null);
        } else if (Date.now() > waitingUntil) {
          setLink(null);
          setWaitingUntil(null);
          setError('The Telegram link expired. Tap Connect Telegram to try again.');
        }
      } catch {
        // keep polling; transient network errors are fine
      }
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [waitingUntil]);

  const handleToggle = async (key: EditableKey, next: boolean) => {
    if (!prefs) return;
    setError(null);
    const previous = prefs;
    setPrefs({ ...prefs, [key]: next });

    try {
      setPrefs(await updateNotificationPreferences({ [key]: next }));
    } catch (err) {
      setPrefs(previous);
      setError(getApiErrorMessage(err));
    }
  };

  const handleConnect = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await startTelegramConnect();
      if (!result.deepLink) {
        setError('Telegram is not set up on the server yet. Please contact the administrator.');
        return;
      }
      setLink(result);
      setWaitingUntil(Date.now() + result.expiresInSeconds * 1000);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    setBusy(true);
    try {
      await disconnectTelegram();
      setTelegram({ connected: false, telegramUsername: null });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!prefs || !telegram) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        {error ?? 'Loading notification settings...'}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-900">How should we notify you?</p>

      <div className="mt-1 divide-y divide-slate-100">
        <ToggleRow
          label="In-app"
          description="Always on, so you never miss important notices."
          checked
          disabled
          onChange={() => {}}
        />
        <ToggleRow
          label="Email"
          checked={prefs.emailEnabled}
          onChange={(v) => handleToggle('emailEnabled', v)}
        />
        <ToggleRow
          label="Push notifications"
          description="Also turn push on for each device in the section above."
          checked={prefs.pushEnabled}
          onChange={(v) => handleToggle('pushEnabled', v)}
        />
        <ToggleRow
          label="Telegram"
          description={telegram.connected ? undefined : 'Connect Telegram below to use this.'}
          checked={prefs.telegramEnabled}
          onChange={(v) => handleToggle('telegramEnabled', v)}
        />
        <ToggleRow
          label="SMS"
          description="Your administrator may text you from their own phone."
          checked={prefs.smsEnabled}
          onChange={(v) => handleToggle('smsEnabled', v)}
        />
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-900">Telegram</p>

        {telegram.connected ? (
          <>
            <p className="mt-1 text-sm text-green-700">
              Connected{telegram.telegramUsername ? ` as @${telegram.telegramUsername}` : ''}.
            </p>
            <Button className="mt-2" variant="outline" size="sm" disabled={busy} onClick={handleDisconnect}>
              Disconnect
            </Button>
          </>
        ) : link?.deepLink ? (
          <>
            <p className="mt-1 text-sm text-slate-600">
              Open Telegram and press <strong>Start</strong>. Waiting for the connection...
            </p>
            <a
              href={link.deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Open Telegram
            </a>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Get your updates in Telegram. You&apos;ll be asked to press Start in our bot.
            </p>
            <Button className="mt-2" size="sm" disabled={busy} onClick={handleConnect}>
              {busy ? 'Please wait...' : 'Connect Telegram'}
            </Button>
          </>
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
