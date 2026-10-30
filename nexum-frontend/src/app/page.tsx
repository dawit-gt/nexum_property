import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { FeaturedRooms } from '@/components/public/featured-rooms';
import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';
import { RedirectIfSignedIn } from '@/components/public/redirect-if-signed-in';

export const metadata: Metadata = {
  title: 'Nexum — Find and rent your space',
  description:
    'Browse available rooms, request the one you like, and manage your lease and payments online with Nexum.',
};

const STEPS = [
  {
    title: 'Create an account',
    text: 'Sign up in a minute with your name, phone and email.',
  },
  {
    title: 'Upload your documents',
    text: 'Add your business license and other papers. An admin reviews them and approves your account.',
  },
  {
    title: 'Request your room',
    text: 'Pick a room, choose your move-in date, and track your lease and payments from your phone.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white">
      <RedirectIfSignedIn />
      <PublicHeader />

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-slate-50 to-white">
          <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:py-20">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Find the right space
              <br className="hidden sm:block" /> for your business
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
              Browse available rooms, request the one you like, and manage your lease and payments online.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/explore" className={buttonVariants({ size: 'lg' })}>
                Browse available rooms
              </Link>
              <Link href="/register" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                Create an account
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Already a tenant?{' '}
              <Link href="/login" className="font-medium text-slate-900 underline">
                Sign in
              </Link>
            </p>
          </div>
        </section>

        {/* Rooms */}
        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-xl font-semibold text-slate-900">Available now</h2>
          <p className="mt-1 text-sm text-slate-500">Fresh from our listings. Tap a room to see photos and details.</p>
          <div className="mt-6">
            <FeaturedRooms limit={6} />
          </div>
        </section>

        {/* How it works */}
        <section className="bg-slate-50">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="text-center text-xl font-semibold text-slate-900">How it works</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="flex size-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-3 font-medium text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final call to action */}
        <section className="bg-slate-900">
          <div className="mx-auto max-w-5xl px-4 py-12 text-center">
            <h2 className="text-xl font-semibold text-white">Ready to find your space?</h2>
            <p className="mt-2 text-sm text-slate-300">Create your account and send your first request today.</p>
            <Link href="/register" className={`${buttonVariants({ size: 'lg' })} mt-6 bg-white text-slate-900 hover:bg-slate-100`}>
              Sign up now
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}