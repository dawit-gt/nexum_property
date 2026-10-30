'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthShell } from '@/components/layout/auth-shell';
import { RegistrationDocuments } from '@/components/auth/registration-documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { apiPost, getApiErrorMessage } from '@/lib/api-client';
import { nextQuery, safeNextPath } from '@/lib/safe-redirect';
import { registerSchema, type RegisterFormValues } from '@/lib/validations/auth';

function RegisterFlow() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();
  // Set when someone was sent here from a page, e.g. a room they wanted to request.
  const next = safeNextPath(useSearchParams().get('next'));
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  // Someone who is already approved (or an admin) has no reason to be here.
  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role === 'ADMIN') router.replace('/admin/dashboard');
    else if (user.registrationStatus === 'APPROVED') router.replace(next ?? '/dashboard');
  }, [isLoading, user, router, next]);

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);

    try {
      await apiPost('/auth/register', {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        telegramUsername: values.telegramUsername || undefined,
      });
    } catch (err) {
      setServerError(getApiErrorMessage(err));
      return;
    }

    // Sign in right away so the documents can be uploaded in the next step.
    try {
      await login(values.email, values.password);
    } catch {
      const params = new URLSearchParams({ registered: 'true' });
      if (next) params.set('next', next);
      router.push(`/login?${params.toString()}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  // Step 2: the account exists and the person is signed in.
  if (user && user.role !== 'ADMIN' && user.registrationStatus !== 'APPROVED') {
    return (
      <AuthShell
        title="Upload your documents"
        subtitle={`Almost done, ${user.firstName}. Add your documents so an admin can approve your account`}
        footer={null}
      >
        <RegistrationDocuments nextPath={next} />
      </AuthShell>
    );
  }

  // Step 1: account details.
  return (
    <AuthShell
      title="Create your account"
      subtitle={
        next?.startsWith('/rooms/')
          ? 'Create an account to request this room. Next you will upload your documents'
          : 'Next you will upload your documents, then an admin reviews your registration'
      }
      footer={
        <>
          Already have an account?{' '}
          <Link href={`/login${nextQuery(next)}`} className="font-medium text-slate-900 underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" autoComplete="given-name" {...register('firstName')} />
            {errors.firstName ? <p className="text-sm text-red-600">{errors.firstName.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" autoComplete="family-name" {...register('lastName')} />
            {errors.lastName ? <p className="text-sm text-red-600">{errors.lastName.message}</p> : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" {...register('email')} />
          {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+251911223344" {...register('phone')} />
          {errors.phone ? <p className="text-sm text-red-600">{errors.phone.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telegramUsername">Telegram username (optional)</Label>
          <Input id="telegramUsername" {...register('telegramUsername')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          {errors.password ? <p className="text-sm text-red-600">{errors.password.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
          {errors.confirmPassword ? <p className="text-sm text-red-600">{errors.confirmPassword.message}</p> : null}
        </div>

        {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Continue'}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterFlow />
    </Suspense>
  );
}