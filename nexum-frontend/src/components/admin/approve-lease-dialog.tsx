'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ApproveLeaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (durationMonths: number) => Promise<void>;
}

export function ApproveLeaseDialog({ open, onOpenChange, onConfirm }: ApproveLeaseDialogProps) {
  const [durationMonths, setDurationMonths] = useState('12');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    const value = Number(durationMonths);
    if (!value || value < 1) return;
    setIsSubmitting(true);
    try {
      await onConfirm(value);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve request &amp; create lease</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="durationMonths">Lease duration (months)</Label>
          <Input
            id="durationMonths"
            type="number"
            min={1}
            max={60}
            value={durationMonths}
            onChange={(e) => setDurationMonths(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={handleConfirm}>
            {isSubmitting ? 'Approving...' : 'Approve & create lease'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}