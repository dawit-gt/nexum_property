'use client';

import { useEffect, useState } from 'react';
import { ToggleRow } from '@/components/ui/toggle-row';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  getAdminNotificationPreferences,
  updateAdminNotificationPreferences,
} from '@/lib/api/notifications';
import type { AdminNotificationPreference } from '@/types/notification';

interface Row {
  key: keyof AdminNotificationPreference;
  label: string;
  description?: string;
}

const GROUPS: { title: string; hint: string; rows: Row[] }[] = [
  {
    title: 'Payment-due alerts',
    hint: 'Checked daily. You are alerted when a lease has a payment due within 7 days.',
    rows: [
      { key: 'paymentsDueInApp', label: 'In-app' },
      { key: 'paymentsDueEmail', label: 'Email' },
      {
        key: 'paymentsDuePush',
        label: 'Push',
        description: 'Also turn push on for this device in the card above.',
      },
    ],
  },
  {
    title: 'New registrations',
    hint: 'When a new tenant signs up and is waiting for approval.',
    rows: [
      { key: 'registrationInApp', label: 'In-app' },
      { key: 'registrationEmail', label: 'Email' },
    ],
  },
  {
    title: 'New maintenance requests',
    hint: 'When a tenant reports an issue.',
    rows: [
      { key: 'maintenanceInApp', label: 'In-app' },
      { key: 'maintenanceEmail', label: 'Email' },
    ],
  },
];

export function AdminAlertPreferencesCard() {
  const [prefs, setPrefs] = useState<AdminNotificationPreference | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminNotificationPreferences()
      .then(setPrefs)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  const handleToggle = async (key: keyof AdminNotificationPreference, next: boolean) => {
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
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="text-sm font-medium text-slate-900">{group.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{group.hint}</p>
          <div className="mt-1 divide-y divide-slate-100">
            {group.rows.map((row) => (
              <ToggleRow
                key={row.key}
                label={row.label}
                description={row.description}
                checked={prefs[row.key]}
                onChange={(v) => handleToggle(row.key, v)}
              />
            ))}
          </div>
        </div>
      ))}

      <p className="text-xs text-slate-500">
        New payments, room requests and tenant messages always appear in your Notifications.
      </p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
