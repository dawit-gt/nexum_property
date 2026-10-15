'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  disablePush,
  enablePush,
  getCurrentSubscription,
  pushSupported,
} from '@/lib/push';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function DeviceSettingsCard() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setInstalled(
        window.matchMedia('(display-mode: standalone)').matches ||
          (navigator as unknown as { standalone?: boolean }).standalone === true,
      );
      setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));

      const ok = pushSupported();
      setSupported(ok);
      if (ok) {
        getCurrentSubscription()
          .then((s) => setSubscribed(!!s))
          .catch(() => {});
      }
    });

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const handleTogglePush = async () => {
    setError(null);
    setBusy(true);
    try {
      if (subscribed) {
        await disablePush();
        setSubscribed(false);
      } else {
        await enablePush();
        setSubscribed(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-900">Install app</p>
        {installed ? (
          <p className="mt-1 text-sm text-green-700">Nexum is installed on this device.</p>
        ) : installEvent ? (
          <Button className="mt-2" variant="outline" size="sm" onClick={handleInstall}>
            Install Nexum
          </Button>
        ) : isIos ? (
          <p className="mt-1 text-sm text-slate-500">
            On iPhone: tap the Share button in Safari, then &quot;Add to Home Screen&quot;.
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            Use your browser menu and choose &quot;Install app&quot; or &quot;Add to Home screen&quot;.
          </p>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-slate-900">Push notifications</p>
        {!supported ? (
          <p className="mt-1 text-sm text-slate-500">
            {isIos
              ? 'On iPhone, add Nexum to your Home Screen first, then open it from there to turn notifications on.'
              : "This browser doesn't support push notifications."}
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">
              {subscribed
                ? 'This device receives notifications, even when the app is closed.'
                : 'Get payment, message and request updates on this device.'}
            </p>
            <Button
              className="mt-2"
              variant={subscribed ? 'outline' : 'default'}
              size="sm"
              disabled={busy}
              onClick={handleTogglePush}
            >
              {busy ? 'Please wait...' : subscribed ? 'Turn off' : 'Turn on'}
            </Button>
          </>
        )}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}