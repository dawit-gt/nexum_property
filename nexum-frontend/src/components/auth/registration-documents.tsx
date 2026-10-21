'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api-client';
import { uploadDocument } from '@/lib/api/documents';
import { cn } from '@/lib/utils';
import type { DocumentType } from '@/types/document';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

interface Slot {
  type: DocumentType;
  title: string;
  label: string;
  optional?: boolean;
}

const SLOTS: Slot[] = [
  { type: 'BUSINESS_LICENSE', title: 'Business license', label: 'Business license (ንግድ ፈቃድ)' },
  { type: 'ESTABLISHMENT_DOC', title: 'Establishment document', label: 'Establishment document (መመስረቻ)' },
  { type: 'CLEARANCE', title: 'Clearance', label: 'Clearance' },
  { type: 'AGREEMENT', title: 'Agreement', label: 'Agreement' },
  { type: 'OTHER', title: 'Other document', label: 'Other document (optional)', optional: true },
];

interface SlotState {
  file: File | null;
  status: 'idle' | 'uploading' | 'done' | 'error';
  error?: string;
}

const EMPTY: SlotState = { file: null, status: 'idle' };

export function RegistrationDocuments() {
  const router = useRouter();

  const [slots, setSlots] = useState<Record<DocumentType, SlotState>>({
    BUSINESS_LICENSE: EMPTY,
    ESTABLISHMENT_DOC: EMPTY,
    CLEARANCE: EMPTY,
    AGREEMENT: EMPTY,
    OTHER: EMPTY,
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const patch = (type: DocumentType, next: Partial<SlotState>) =>
    setSlots((prev) => ({ ...prev, [type]: { ...prev[type], ...next } }));

  const handleChoose = (type: DocumentType, file: File | undefined) => {
    setNotice(null);

    if (!file) {
      patch(type, { file: null, status: 'idle', error: undefined });
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      patch(type, { file: null, status: 'error', error: 'Choose a PDF, JPG or PNG file.' });
      return;
    }
    if (file.size > MAX_BYTES) {
      patch(type, { file: null, status: 'error', error: 'The file must be 5MB or smaller.' });
      return;
    }

    patch(type, { file, status: 'idle', error: undefined });
  };

  const goToDashboard = () => router.push('/dashboard');

  const handleUpload = async () => {
    setNotice(null);

    const alreadyDone = SLOTS.some((s) => slots[s.type].status === 'done');
    const queue = SLOTS.filter((s) => slots[s.type].file && slots[s.type].status !== 'done');

    if (queue.length === 0) {
      if (alreadyDone) goToDashboard();
      else setNotice('Choose at least one file, or skip for now.');
      return;
    }

    setBusy(true);
    let failed = 0;

    for (const slot of queue) {
      const file = slots[slot.type].file;
      if (!file) continue;

      patch(slot.type, { status: 'uploading', error: undefined });
      try {
        await uploadDocument(slot.type, slot.title, file);
        patch(slot.type, { status: 'done' });
      } catch (err) {
        failed += 1;
        patch(slot.type, { status: 'error', error: getApiErrorMessage(err) });
      }
    }

    setBusy(false);

    if (failed === 0) goToDashboard();
    else setNotice('Some files could not be uploaded. Fix them and press Upload again, or skip and add them later from your Profile.');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        An admin reviews these before approving your account. PDF, JPG or PNG, up to 5MB each. You can also add or
        replace them later from your Profile.
      </p>

      {SLOTS.map((slot) => {
        const state = slots[slot.type];
        return (
          <div key={slot.type} className="space-y-1.5">
            <Label htmlFor={`doc-${slot.type}`}>{slot.label}</Label>
            <Input
              id={`doc-${slot.type}`}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              disabled={busy || state.status === 'done'}
              onChange={(e) => handleChoose(slot.type, e.target.files?.[0])}
            />
            {state.status === 'uploading' ? <p className="text-xs text-slate-500">Uploading...</p> : null}
            {state.status === 'done' ? <p className="text-xs text-green-700">Uploaded</p> : null}
            {state.error ? <p className={cn('text-xs text-red-600')}>{state.error}</p> : null}
          </div>
        );
      })}

      {notice ? <p className="text-sm text-amber-700">{notice}</p> : null}

      <Button type="button" className="w-full" size="lg" disabled={busy} onClick={handleUpload}>
        {busy ? 'Uploading...' : 'Upload documents'}
      </Button>
      <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={goToDashboard}>
        Skip for now
      </Button>
    </div>
  );
}