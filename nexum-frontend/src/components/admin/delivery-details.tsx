'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ContactHandoffDialog, type HandoffTarget } from '@/components/admin/contact-handoff-dialog';
import { getApiErrorMessage } from '@/lib/api-client';
import { getMessageDeliveries } from '@/lib/api/admin-messages';
import { cn } from '@/lib/utils';
import type { MessageDeliveryRecipient } from '@/types/message';
import type { DeliveryStatus, NotificationChannel } from '@/types/notification';

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  IN_APP: 'In-app',
  EMAIL: 'Email',
  PUSH: 'Push',
  TELEGRAM: 'Telegram',
  SMS: 'SMS',
};

const STATUS_STYLES: Record<DeliveryStatus, { label: string; className: string }> = {
  CREATED: { label: 'Queued', className: 'bg-amber-100 text-amber-800' },
  SENT: { label: 'Sent', className: 'bg-green-100 text-green-800' },
  READ: { label: 'Read', className: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-800' },
  OPENED_FOR_SENDING: { label: 'Opened for sending', className: 'bg-blue-100 text-blue-800' },
};

interface DeliveryDetailsProps {
  messageId: string;
  subject: string;
  body: string;
}

export function DeliveryDetails({ messageId, subject, body }: DeliveryDetailsProps) {
  const [recipients, setRecipients] = useState<MessageDeliveryRecipient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<HandoffTarget | null>(null);

  const load = useCallback(async () => {
    try {
      setRecipients(await getMessageDeliveries(messageId));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, [messageId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="mt-3 text-sm text-red-600">{error}</p>;
  if (!recipients) return <p className="mt-3 text-sm text-slate-500">Loading delivery details...</p>;

  if (recipients.length === 0) {
    return (
      <p className="mt-3 text-sm text-slate-500">
        No delivery details are available. They are recorded for messages sent after this feature was added.
      </p>
    );
  }

  const message = `${subject}: ${body}`;

  return (
    <div className="mt-3 space-y-4 border-t border-slate-100 pt-3">
      {recipients.map((r) => {
        const name = `${r.user.firstName} ${r.user.lastName}`;
        const failed = r.deliveries.filter((d) => d.status === 'FAILED' && d.errorMessage);

        return (
          <div key={r.notificationId}>
            <p className="text-sm font-medium text-slate-900">
              {name} <span className="font-normal text-slate-400">· {r.user.phone}</span>
            </p>

            <div className="mt-1.5 flex flex-wrap gap-2">
              {r.deliveries.map((d) => {
                const style = STATUS_STYLES[d.status];
                return (
                  <span
                    key={d.id}
                    title={d.errorMessage ?? undefined}
                    className={cn('rounded-full px-2 py-0.5 text-xs font-medium', style.className)}
                  >
                    {CHANNEL_LABELS[d.channel]}: {style.label}
                  </span>
                );
              })}
            </div>

            {failed.length > 0 ? (
              <p className="mt-1.5 text-xs text-red-700">
                {failed.map((d) => `${CHANNEL_LABELS[d.channel]}: ${d.errorMessage}`).join(' · ')}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setHandoff({
                    mode: 'sms',
                    name,
                    phone: r.user.phone,
                    telegramUsername: r.user.telegramUsername,
                    message,
                  })
                }
              >
                Open SMS
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setHandoff({
                    mode: 'telegram',
                    name,
                    phone: r.user.phone,
                    telegramUsername: r.user.telegramUsername,
                    message,
                  })
                }
              >
                Open Telegram
              </Button>
            </div>
          </div>
        );
      })}

      <ContactHandoffDialog target={handoff} onClose={() => setHandoff(null)} />
    </div>
  );
}