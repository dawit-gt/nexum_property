'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-client';

export interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'textarea';
  required?: boolean;
  placeholder?: string;
  step?: string;
}

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FormField[];
  submitLabel?: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  fields,
  submitLabel = 'Save',
  onSubmit,
}: FormDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setValues({});
      setError(null);
    }

    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(values);
      setValues({});
      onOpenChange(false);
    } catch (err) {
      // Dialog stays open on failure so the admin can fix and retry.
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const setValue = (name: string, value: string) =>
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div
              key={field.name}
              className="space-y-1.5"
            >
              <Label htmlFor={`field-${field.name}`}>
                {field.label}
                {field.required ? '' : ' (optional)'}
              </Label>

              {field.type === 'textarea' ? (
                <Textarea
                  id={`field-${field.name}`}
                  rows={3}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ''}
                  onChange={(e) =>
                    setValue(
                      field.name,
                      e.target.value,
                    )
                  }
                />
              ) : (
                <Input
                  id={`field-${field.name}`}
                  type={field.type ?? 'text'}
                  step={field.step}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ''}
                  onChange={(e) =>
                    setValue(
                      field.name,
                      e.target.value,
                    )
                  }
                />
              )}
            </div>
          ))}

          {error ? (
            <p className="text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                handleOpenChange(false)
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving...'
                : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}