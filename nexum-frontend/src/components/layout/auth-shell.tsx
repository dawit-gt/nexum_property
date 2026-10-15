import Link from 'next/link';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh flex-col justify-center bg-neutral-50 px-4 py-8 sm:items-center">
      <div className="w-full sm:max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-slate-900">
            Nexum
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {children}
        </div>

        {footer ? <div className="mt-4 text-center text-sm text-slate-500">{footer}</div> : null}
      </div>
    </div>
  );
}