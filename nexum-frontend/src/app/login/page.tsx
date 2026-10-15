'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthShell } from '@/components/layout/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  loginSchema,
  type LoginFormValues,
} from '@/lib/validations/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    try {
      const loggedInUser = await login(
        values.email,
        values.password,
      );

      router.push(
        loggedInUser.role === 'ADMIN'
          ? '/admin/dashboard'
          : '/dashboard',
      );
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  };

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back to Nexum"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-slate-900 underline"
          >
            Register
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>

          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            {...register('email')}
          />

          {errors.email ? (
            <p className="text-sm text-red-600">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>

            <Link
              href="/forgot-password"
              className="text-sm text-slate-500 underline"
            >
              Forgot?
            </Link>
          </div>

          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />

          {errors.password ? (
            <p className="text-sm text-red-600">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        {serverError ? (
          <p className="text-sm text-red-600">
            {serverError}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Logging in...' : 'Log in'}
        </Button>
      </form>
    </AuthShell>
  );
}