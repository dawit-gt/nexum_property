'use client';

import { useEffect, useState } from 'react';
import { ToggleRow } from '@/components/ui/toggle-row';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  getAdminNotificationPreferences,
  updateAdminNotificationPreferences,
} from '@/lib/api/notifications';
import type { AdminNotificationPreference } from '@/types/notification';

type PaymentsDueKey = 'paymentsDueInApp' | 'paymentsDueEmail' | 'paymentsDuePush';

export function AdminAlertPreferencesCard() {
  const [prefs, setPrefs] = useState<AdminNotificationPreference | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminNotificationPreferences()
      .then(setPrefs)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  const handleToggle = async (key: PaymentsDueKey, next: boolean) => {
    if (!prefs) return;
    setError(null);
    const previous = prefs;
    setPrefs({ ...prefs, [key]: next });

    try {
      setPrefs(await updateAdminNotificationPreferences({ [key]: next }));
    } catch (err) {
      setPrefs(previous);
      setError(getApiErrorMessage(err));
    }
  };

  if (!prefs) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        {error ?? 'Loading alert settings...'}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-900">Payment-due alerts</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Checked daily. You are alerted when a lease has a payment due within 7 days.
      </p>

      <div className="mt-1 divide-y divide-slate-100">
        <ToggleRow
          label="In-app"
          checked={prefs.paymentsDueInApp}
          onChange={(v) => handleToggle('paymentsDueInApp', v)}
        />
        <ToggleRow
          label="Email"
          checked={prefs.paymentsDueEmail}
          onChange={(v) => handleToggle('paymentsDueEmail', v)}
        />
        <ToggleRow
          label="Push"
          description="Also turn push on for this device in the card above."
          checked={prefs.paymentsDuePush}
          onChange={(v) => handleToggle('paymentsDuePush', v)}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
