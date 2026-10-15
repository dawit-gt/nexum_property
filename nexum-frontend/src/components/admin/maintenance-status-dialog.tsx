'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api-client';
import type { MaintenanceStatus } from '@/types/maintenance';

const STATUS_OPTIONS: MaintenanceStatus[] = ['IN_PROGRESS', 'RESOLVED', 'REJECTED'];

interface MaintenanceStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (status: MaintenanceStatus, adminNotes: string, takeRoomOutOfService: boolean) => Promise<void>;
  currentStatus: MaintenanceStatus;
}

export function MaintenanceStatusDialog({ open, onOpenChange, onConfirm, currentStatus }: MaintenanceStatusDialogProps) {
  const [status, setStatus] = useState<MaintenanceStatus>(
    currentStatus === 'PENDING' ? 'IN_PROGRESS' : STATUS_OPTIONS.find((s) => s !== currentStatus) ?? 'IN_PROGRESS',
  );
  const [notes, setNotes] = useState('');
  const [takeOutOfService, setTakeOutOfService] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setNotes('');
      setTakeOutOfService(false);
      setError(null);
    }
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(status, notes, takeOutOfService);
      handleOpenChange(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update ticket status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as MaintenanceStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {status === 'IN_PROGRESS' ? (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={takeOutOfService}
                onChange={(e) => setTakeOutOfService(e.target.checked)}
              />
              Take the room out of service (marks it MAINTENANCE, hides it from tenants until resolved)
            </label>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="adminNotes">Notes {status === 'REJECTED' ? '(required)' : '(optional)'}</Label>
            <Textarea
              id="adminNotes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={status === 'REJECTED' ? 'Why this ticket is being rejected' : undefined}
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={isSubmitting || (status === 'REJECTED' && !notes.trim())} onClick={handleConfirm}>
            {isSubmitting ? 'Saving...' : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}