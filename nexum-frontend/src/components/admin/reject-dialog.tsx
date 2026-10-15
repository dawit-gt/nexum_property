'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-client';

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  title?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  placeholder?: string;
}

export function RejectDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Reject',
  confirmLabel = 'Confirm reject',
  pendingLabel = 'Rejecting...',
  placeholder = 'Reason for rejection (required)',
}: RejectDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason('');
      setError(null);
    }
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(reason);
      handleOpenChange(false);
    } catch (err) {
      // Stay open on failure so the typed reason isn't lost.
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder={placeholder}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!reason.trim() || isSubmitting} onClick={handleConfirm}>
            {isSubmitting ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}