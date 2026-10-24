'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import { InboxList } from '@/components/messages/inbox-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api-client';
import { listMySentMessages, sendMessageToAdmins } from '@/lib/api/messages';
import { cn } from '@/lib/utils';
import type { SentMessage } from '@/types/message';

type Tab = 'inbox' | 'sent' | 'new';

const TABS: { key: Tab; label: string }[] = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'sent', label: 'Sent' },
  { key: 'new', label: 'New message' },
];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TenantMessagesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('inbox');

  // Sent
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [sentLoading, setSentLoading] = useState(true);
  const [sentError, setSentError] = useState<string | null>(null);

  // Compose
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const loadSent = useCallback(async () => {
    try {
      setSent(await listMySentMessages());
    } catch (err) {
      setSentError(getApiErrorMessage(err));
    } finally {
      setSentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
      void loadSent();
    });
  }, [user, loadSent]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposeError(null);
    setNotice(null);

    if (!subject.trim() || !body.trim()) {
      return setComposeError('Subject and message are required');
    }

    setIsSending(true);
    try {
      await sendMessageToAdmins(subject.trim(), body.trim());
      setSubject('');
      setBody('');
      setNotice('Message sent to the admin team.');
      await loadSent();
      setTab('sent');
    } catch (err) {
      setComposeError(getApiErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="p-4">
        <h1 className="text-lg font-semibold text-slate-900">Messages</h1>

        <div className="mt-3 flex gap-1 rounded-lg bg-slate-100 p-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === 'inbox' ? <InboxList /> : null}

          {tab === 'sent' ? (
            <div className="space-y-2">
              {notice ? <p className="text-sm text-green-700">{notice}</p> : null}
              {sentError ? <p className="text-sm text-red-600">{sentError}</p> : null}

              {sentLoading ? (
                <>
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </>
              ) : sent.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">You haven&apos;t sent any messages.</p>
              ) : (
                sent.map((m) => {
                  const seen = m.recipients.some((r) => r.isRead);
                  return (
                    <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm font-medium text-slate-900">{m.subject}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(m.createdAt)} · {seen ? 'Seen by admin' : 'Not seen yet'}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{m.body}</p>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}

          {tab === 'new' ? (
            <form onSubmit={handleSend} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Your message goes to the admin team.</p>

              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="body">Message</Label>
                <Textarea id="body" rows={5} required value={body} onChange={(e) => setBody(e.target.value)} />
              </div>

              {composeError ? <p className="text-sm text-red-600">{composeError}</p> : null}

              <Button type="submit" className="w-full" size="lg" disabled={isSending}>
                {isSending ? 'Sending...' : 'Send message'}
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}