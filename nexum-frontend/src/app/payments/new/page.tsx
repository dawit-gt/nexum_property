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
import { createPayment } from '@/lib/api/payments';
import { getApiErrorMessage } from '@/lib/api-client';
import type { Lease } from '@/types/lease';

export default function NewPaymentPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [leases, setLeases] = useState<Lease[]>([]);
  const [leaseId, setLeaseId] = useState('');
  const [amount, setAmount] = useState('');
  const [monthsCovered, setMonthsCovered] = useState('1');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [note, setNote] = useState('');
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

    if (!leaseId) return setError('Select a lease');
    if (!file) return setError('Attach a receipt');

    setIsSubmitting(true);
    try {
      await createPayment({
        leaseId,
        amount: Number(amount),
        monthsCovered: Number(monthsCovered),
        paymentDate,
        paymentMethod: paymentMethod || undefined,
        referenceNumber: referenceNumber || undefined,
        note: note || undefined,
        file,
      });
      router.push('/payments');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4">
        <h1 className="text-lg font-semibold text-slate-900">Submit a payment</h1>

        {leases.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">You don&apos;t have an active lease to pay against.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4" encType="multipart/form-data">
            <div className="space-y-1.5">
              <Label htmlFor="lease">Lease</Label>
              <Select value={leaseId} onValueChange={(v) => setLeaseId(v ?? '')}>
                <SelectTrigger id="lease" className="w-full">
                  <SelectValue placeholder="Select a lease" />
                </SelectTrigger>
                <SelectContent>
                  {leases.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      Room {l.room.roomNumber} — {l.leaseNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (ETB)</Label>
                <Input id="amount" type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthsCovered">Months covered</Label>
                <Input id="monthsCovered" type="number" min="1" max="24" required value={monthsCovered} onChange={(e) => setMonthsCovered(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paymentDate">Payment date</Label>
              <Input id="paymentDate" type="date" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="paymentMethod">Method (optional)</Label>
                <Input id="paymentMethod" placeholder="Bank transfer" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="referenceNumber">Reference (optional)</Label>
                <Input id="referenceNumber" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="file">Receipt (PDF, JPG, or PNG — max 5MB)</Label>
              <Input
                id="file"
                type="file"
                accept="application/pdf,image/jpeg,image/jpg,image/png"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit payment'}
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}