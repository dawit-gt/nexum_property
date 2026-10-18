'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface HandoffTarget {
  mode: 'sms' | 'telegram';
  name: string;
  phone: string;
  telegramUsername: string | null;
  message: string;
}

function buildSmsLink(phone: string, message: string) {
  return `sms:${phone}?body=${encodeURIComponent(message)}`;
}

/** Local Ethiopian numbers (09...) become international (251...) for t.me links. */
function telegramDigits(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? `251${digits.slice(1)}` : digits;
}

function buildTelegramLink(phone: string, username: string | null) {
  const clean = username?.replace(/^@/, '').trim();
  if (clean && /^[A-Za-z0-9_]{4,32}$/.test(clean)) return `https://t.me/${clean}`;
  return `https://t.me/+${telegramDigits(phone)}`;
}

function MessagePreview({ message }: { message: string }) {
  return (
    <p className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
      {message}
    </p>
  );
}

function SmsBody({ target }: { target: HandoffTarget }) {
  const smsLink = buildSmsLink(target.phone, target.message);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(smsLink, { width: 300, margin: 2 })
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [smsLink]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Nexum doesn&apos;t send SMS itself. Open the message in your phone&apos;s SMS app and press send.
      </p>

      <MessagePreview message={target.message} />

      <a
        href={smsLink}
        className="block rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white"
      >
        Open SMS app ({target.phone})
      </a>

      <div>
        <p className="text-sm font-medium text-slate-900">On a computer? Scan with your phone</p>
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR code that opens the SMS on your phone" className="mx-auto mt-2 size-48" />
        ) : (
          <p className="mt-2 text-sm text-slate-500">Preparing QR code...</p>
        )}
      </div>
    </div>
  );
}

function TelegramBody({ target }: { target: HandoffTarget }) {
  const link = buildTelegramLink(target.phone, target.telegramUsername);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(target.message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Copy the message, open the chat in Telegram, then paste it and press send.
      </p>

      <MessagePreview message={target.message} />

      <Button type="button" variant="outline" className="w-full" onClick={handleCopy}>
        {copied ? 'Copied' : 'Copy message'}
      </Button>

      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white"
      >
        Open Telegram chat
      </a>

      <p className="text-xs text-slate-500">
        {target.telegramUsername
          ? `Opens @${target.telegramUsername.replace(/^@/, '')}.`
          : `No Telegram username on file, so this uses their phone number (${target.phone}). It only works if they have Telegram and allow it.`}
      </p>
    </div>
  );
}

interface ContactHandoffDialogProps {
  target: HandoffTarget | null;
  onClose: () => void;
}

export function ContactHandoffDialog({ target, onClose }: ContactHandoffDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {target?.mode === 'sms' ? 'Send SMS to' : 'Message on Telegram:'} {target?.name}
          </DialogTitle>
        </DialogHeader>
        {target ? target.mode === 'sms' ? <SmsBody target={target} /> : <TelegramBody target={target} /> : null}
      </DialogContent>
    </Dialog>
  );
}