'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listMyLeases } from '@/lib/api/leases';
import { createMaintenanceRequest } from '@/lib/api/maintenance';
import { getApiErrorMessage } from '@/lib/api-client';
import type { Lease } from '@/types/lease';

export default function NewMaintenanceTicketPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [leases, setLeases] = useState<Lease[]>([]);
  const [roomId, setRoomId] = useState('');
  const [issueTitle, setIssueTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    listMyLeases().then((all) => setLeases(all.filter((l) => l.status === 'ACTIVE')));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!roomId) return setError('Select a room');

    setIsSubmitting(true);
    try {
      await createMaintenanceRequest({ roomId, issueTitle, description, file: file ?? undefined });
      router.push('/requests');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4">
        <h1 className="text-lg font-semibold text-slate-900">New maintenance ticket</h1>

        {leases.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">You don&apos;t have an active lease to file a ticket for.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="room">Room</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger id="room" className="w-full">
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {leases.map((l) => (
                    <SelectItem key={l.roomId} value={l.roomId}>
                      Room {l.room.roomNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="issueTitle">Issue</Label>
              <Input id="issueTitle" required placeholder="Leaking faucet" value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="file">Photo (optional, JPG or PNG, max 5MB)</Label>
              <Input
                id="file"
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit ticket'}
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}