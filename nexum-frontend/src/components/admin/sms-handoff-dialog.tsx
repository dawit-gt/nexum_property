'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/api-client';
import { getSmsHandoff } from '@/lib/api/admin-messages';
import type { SmsHandoff } from '@/types/message';

function HandoffBody({ deliveryId, onOpened }: { deliveryId: string; onOpened: () => void }) {
  const [handoff, setHandoff] = useState<SmsHandoff | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getSmsHandoff(deliveryId)
      .then((data) => {
        if (cancelled) return;
        setHandoff(data);
        onOpened();
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!handoff) return <p className="text-sm text-slate-500">Preparing the message...</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Nexum doesn&apos;t send SMS itself. Open the message in your phone&apos;s SMS app and press send.
      </p>

      <a
        href={handoff.smsLink}
        className="block rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white"
      >
        Open SMS app ({handoff.phone})
      </a>

      <div>
        <p className="text-sm font-medium text-slate-900">On a computer? Scan with your phone</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={handoff.qrCodeDataUrl}
          alt="QR code that opens the SMS on your phone"
          className="mx-auto mt-2 size-48"
        />
      </div>
    </div>
  );
}

interface SmsHandoffDialogProps {
  /** The SMS delivery to hand off; null keeps the dialog closed. */
  deliveryId: string | null;
  recipientName: string;
  onClose: () => void;
  onOpened: () => void;
}

export function SmsHandoffDialog({ deliveryId, recipientName, onClose, onOpened }: SmsHandoffDialogProps) {
  return (
    <Dialog open={deliveryId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send SMS to {recipientName}</DialogTitle>
        </DialogHeader>
        {deliveryId ? <HandoffBody deliveryId={deliveryId} onOpened={onOpened} /> : null}
      </DialogContent>
    </Dialog>
  );
}
