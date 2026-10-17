'use client';

import { ToggleRow } from '@/components/ui/toggle-row';
import type { NotificationChannel } from '@/types/notification';

type PickableChannel = 'EMAIL' | 'PUSH';

const OPTIONS: { channel: PickableChannel; label: string; description?: string }[] = [
  { channel: 'EMAIL', label: 'Email' },
  { channel: 'PUSH', label: 'Push notification', description: 'Only reaches people who turned push on.' },
];

interface ChannelPickerProps {
  /** null = automatic (each person's preferred channels). */
  value: NotificationChannel[] | null;
  onChange: (next: NotificationChannel[] | null) => void;
}

export function ChannelPicker({ value, onChange }: ChannelPickerProps) {
  const automatic = value === null;

  const toggle = (channel: PickableChannel, on: boolean) => {
    const current = (value ?? []).filter((c) => c !== 'IN_APP');
    const next = on ? [...current, channel] : current.filter((c) => c !== channel);
    onChange(['IN_APP', ...next]);
  };

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-sm font-medium text-slate-900">Delivery channels</p>

      <div className="divide-y divide-slate-100">
        <ToggleRow
          label="Automatic (recommended)"
          description="Use each person's own preferred channels."
          checked={automatic}
          onChange={(on) => onChange(on ? null : ['IN_APP', 'EMAIL'])}
        />

        {!automatic ? (
          <>
            <ToggleRow label="In-app" description="Always included." checked disabled onChange={() => {}} />
            {OPTIONS.map((opt) => (
              <ToggleRow
                key={opt.channel}
                label={opt.label}
                description={opt.description}
                checked={value.includes(opt.channel)}
                onChange={(on) => toggle(opt.channel, on)}
              />
            ))}
          </>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        To reach someone on SMS or Telegram, use the buttons under Delivery details after sending.
      </p>
    </div>
  );
}