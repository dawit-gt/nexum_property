import { redirect } from 'next/navigation';

// Payment-due alerts link to /admin/leases/<id>?due=<date>. There is no
// single-lease page, so send those taps to the leases list.
export default function LeaseAlertRedirectPage() {
  redirect('/admin/leases');
}
