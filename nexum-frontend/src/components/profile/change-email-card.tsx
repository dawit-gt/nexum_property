'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { getApiErrorMessage } from '@/lib/api-client';
import { changeEmail } from '@/lib/api/profile';
import { changeEmailSchema, type ChangeEmailFormValues } from '@/lib/validations/profile';

export function ChangeEmailCard() {
  const { refreshUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeEmailFormValues>({
    resolver: zodResolver(changeEmailSchema),
  });

  const onSubmit = async (values: ChangeEmailFormValues) => {
    setServerError(null);
    setDone(null);
    try {
      await changeEmail(values.newEmail, values.currentPassword);
      await refreshUser();
      reset();
      setDone(`Your email is now ${values.newEmail}. Use it the next time you log in.`);
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <p className="text-sm text-slate-500">
        Your email is also how you log in, so we ask for your current password.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="newEmail">New email</Label>
        <Input id="newEmail" type="email" autoComplete="email" inputMode="email" {...register('newEmail')} />
        {errors.newEmail ? <p className="text-sm text-red-600">{errors.newEmail.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="emailCurrentPassword">Current password</Label>
        <Input
          id="emailCurrentPassword"
          type="password"
          autoComplete="current-password"
          {...register('currentPassword')}
        />
        {errors.currentPassword ? <p className="text-sm text-red-600">{errors.currentPassword.message}</p> : null}
      </div>

      {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
      {done ? <p className="text-sm text-green-700">{done}</p> : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Change email'}
      </Button>
    </form>
  );
}