'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SmsHandoffDialog } from '@/components/admin/sms-handoff-dialog';
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

export function DeliveryDetails({ messageId }: { messageId: string }) {
  const [recipients, setRecipients] = useState<MessageDeliveryRecipient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [smsTarget, setSmsTarget] = useState<{ deliveryId: string; name: string } | null>(null);

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

  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
      {recipients.map((r) => {
        const name = `${r.user.firstName} ${r.user.lastName}`;
        return (
          <div key={r.notificationId}>
            <p className="text-sm font-medium text-slate-900">
              {name} <span className="font-normal text-slate-400">· {r.user.phone}</span>
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {r.deliveries.map((d) => {
                const style = STATUS_STYLES[d.status];
                return (
                  <span key={d.id} className="inline-flex items-center gap-1.5">
                    <span
                      title={d.errorMessage ?? undefined}
                      className={cn('rounded-full px-2 py-0.5 text-xs font-medium', style.className)}
                    >
                      {CHANNEL_LABELS[d.channel]}: {style.label}
                    </span>
                    {d.channel === 'SMS' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSmsTarget({ deliveryId: d.id, name })}
                      >
                        {d.status === 'CREATED' ? 'Send SMS' : 'Open again'}
                      </Button>
                    ) : null}
                  </span>
                );
              })}
            </div>

            {r.deliveries.some((d) => d.status === 'FAILED' && d.errorMessage) ? (
              <p className="mt-1 text-xs text-slate-500">
                {r.deliveries
                  .filter((d) => d.status === 'FAILED' && d.errorMessage)
                  .map((d) => `${CHANNEL_LABELS[d.channel]}: ${d.errorMessage}`)
                  .join(' · ')}
              </p>
            ) : null}
          </div>
        );
      })}

      <SmsHandoffDialog
        deliveryId={smsTarget?.deliveryId ?? null}
        recipientName={smsTarget?.name ?? ''}
        onClose={() => setSmsTarget(null)}
        onOpened={load}
      />
    </div>
  );
}
