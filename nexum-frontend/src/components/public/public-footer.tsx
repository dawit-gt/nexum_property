import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Nexum. Property management made simple.</p>
        <nav className="flex gap-4">
          <Link href="/explore" className="hover:text-slate-900">
            Rooms
          </Link>
          <Link href="/login" className="hover:text-slate-900">
            Sign in
          </Link>
          <Link href="/register" className="hover:text-slate-900">
            Sign up
          </Link>
        </nav>
      </div>
    </footer>
  );
}