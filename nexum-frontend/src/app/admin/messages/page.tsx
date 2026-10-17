'use client';

import { useEffect, useState } from 'react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { UserPicker } from '@/components/admin/user-picker';
import { LocationPicker } from '@/components/admin/location-picker';
import { ChannelPicker } from '@/components/admin/channel-picker';
import { DeliveryDetails } from '@/components/admin/delivery-details';
import { InboxList } from '@/components/messages/inbox-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sendBroadcast, listSentMessages, type BroadcastPayload } from '@/lib/api/admin-messages';
import { getApiErrorMessage } from '@/lib/api-client';
import type { MessageTargetType, SentMessage } from '@/types/message';
import type { NotificationChannel } from '@/types/notification';

const TARGET_OPTIONS: { value: MessageTargetType; label: string }[] = [
  { value: 'INDIVIDUAL', label: 'One tenant' },
  { value: 'SELECTED', label: 'Selected tenants' },
  { value: 'GROUP_ALL', label: 'All tenants' },
  { value: 'GROUP_PROPERTY', label: 'Tenants in a property' },
  { value: 'GROUP_BUILDING', label: 'Tenants in a building' },
  { value: 'GROUP_FLOOR', label: 'Tenants on a floor' },
  { value: 'GROUP_PAYMENTS_DUE_7_DAYS', label: 'Tenants with payment due in 7 days' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminMessagesPage() {
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<MessageTargetType>('GROUP_ALL');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  const [channels, setChannels] = useState<NotificationChannel[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [sent, setSent] = useState<SentMessage[]>([]);
  const [isLoadingSent, setIsLoadingSent] = useState(true);

  const loadSent = () => {
    listSentMessages()
      .then(setSent)
      .finally(() => setIsLoadingSent(false));

    queueMicrotask(() => {
      setIsLoadingSent(true);
    });
  };

  useEffect(() => {
    if (user) loadSent();
  }, [user]);

  // Reset target-specific selections whenever the target type itself changes,
  // so switching from e.g. GROUP_FLOOR to GROUP_ALL doesn't silently carry
  // over a stale floorId into the submit payload.
  const handleTargetChange = (value: MessageTargetType) => {
    setTargetType(value);
    setSelectedUserIds([]);
    setLocationId(undefined);
  };

  const buildPayload = (): BroadcastPayload | null => {
    const base = { subject, body, targetType, ...(channels ? { channels } : {}) };
    switch (targetType) {
      case 'INDIVIDUAL':
        if (!selectedUserIds[0]) return null;
        return { ...base, recipientId: selectedUserIds[0] };
      case 'SELECTED':
        if (selectedUserIds.length === 0) return null;
        return { ...base, recipientIds: selectedUserIds };
      case 'GROUP_PROPERTY':
        if (!locationId) return null;
        return { ...base, propertyId: locationId };
      case 'GROUP_BUILDING':
        if (!locationId) return null;
        return { ...base, buildingId: locationId };
      case 'GROUP_FLOOR':
        if (!locationId) return null;
        return { ...base, floorId: locationId };
      default:
        return base;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const payload = buildPayload();
    if (!payload) {
      setError('Finish selecting a recipient for this target type');
      return;
    }

    setIsSending(true);
    try {
      const created = await sendBroadcast(payload);
      setNotice('Message sent');
      setSubject('');
      setBody('');
      setSelectedUserIds([]);
      setLocationId(undefined);
      loadSent();
      setExpandedId(created.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  if (guardLoading) return null;

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-slate-900">Messages</h1>

      <h2 className="mt-4 text-base font-semibold text-slate-900">Inbox</h2>
      <div className="mt-3">
        <InboxList />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-slate-900">Compose</h2>

        <div className="space-y-1.5">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="body">Message</Label>
          <Textarea id="body" rows={4} required value={body} onChange={(e) => setBody(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Send to</Label>
          <Select value={targetType} onValueChange={(v) => v && handleTargetChange(v as MessageTargetType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {targetType === 'INDIVIDUAL' ? (
          <UserPicker mode="single" selectedIds={selectedUserIds} onChange={setSelectedUserIds} />
        ) : null}
        {targetType === 'SELECTED' ? (
          <UserPicker mode="multi" selectedIds={selectedUserIds} onChange={setSelectedUserIds} />
        ) : null}
        {targetType === 'GROUP_PROPERTY' ? <LocationPicker level="property" onChange={setLocationId} /> : null}
        {targetType === 'GROUP_BUILDING' ? <LocationPicker level="building" onChange={setLocationId} /> : null}
        {targetType === 'GROUP_FLOOR' ? <LocationPicker level="floor" onChange={setLocationId} /> : null}

        <ChannelPicker value={channels} onChange={setChannels} />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {notice ? <p className="text-sm text-green-700">{notice}</p> : null}

        <Button type="submit" className="w-full" disabled={isSending}>
          {isSending ? 'Sending...' : 'Send message'}
        </Button>
      </form>

      <h2 className="mt-6 text-base font-semibold text-slate-900">Sent</h2>
      <div className="mt-3 space-y-3">
        {isLoadingSent ? (
          <>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </>
        ) : sent.length === 0 ? (
          <p className="text-sm text-slate-500">No messages sent yet.</p>
        ) : (
          sent.map((m) => {
            const readCount = m.recipients.filter((r) => r.isRead).length;
            return (
              <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-900">{m.subject}</p>
                  <p className="whitespace-nowrap text-xs text-slate-400">{formatDate(m.createdAt)}</p>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{m.body}</p>
                <p className="mt-1.5 text-xs text-slate-400">
                  {m.recipients.length} recipient{m.recipients.length !== 1 ? 's' : ''} · {readCount} read
                </p>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 px-0"
                  onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                >
                  {expandedId === m.id ? 'Hide delivery details' : 'Delivery details'}
                </Button>

                {expandedId === m.id ? (
                  <DeliveryDetails messageId={m.id} subject={m.subject} body={m.body} />
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </AdminShell>
  );
}