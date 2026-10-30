import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Available rooms — Nexum',
  description: 'Browse the rooms that are open for requests, with photos, size and monthly rent.',
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}