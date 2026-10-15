'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api-client';
import { changePassword } from '@/lib/api/auth';
import { getDocument } from '@/lib/api/admin-documents';
import {
  listMyDocuments,
  reuploadDocument,
  uploadDocument,
} from '@/lib/api/documents';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/lib/validations/auth';
import type { DocumentStatus, DocumentType, MyDocument } from '@/types/document';

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  BUSINESS_LICENSE: 'Business license',
  ESTABLISHMENT_DOC: 'Establishment document',
  CLEARANCE: 'Clearance',
  AGREEMENT: 'Agreement',
  OTHER: 'Other',
};

const STATUS_STYLES: Record<DocumentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status as DocumentStatus] ?? 'bg-slate-100 text-slate-700';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  // ---------- Documents ----------
  const [docs, setDocs] = useState<MyDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);

  const [newType, setNewType] = useState<DocumentType | ''>('');
  const [newTitle, setNewTitle] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reuploadingId, setReuploadingId] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    try {
      setDocs(await listMyDocuments());
    } catch (err) {
      setDocError(getApiErrorMessage(err));
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadDocs();
  }, [user, loadDocs]);

  // Only the newest version of each document (older versions are history)
  const latestDocs = useMemo(() => {
    const replaced = new Set(docs.map((d) => d.previousVersionId).filter(Boolean));
    return docs.filter((d) => !replaced.has(d.id));
  }, [docs]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError(null);
    if (!newType) return setDocError('Select a document type');
    if (!newTitle.trim()) return setDocError('Enter a title');
    if (!newFile) return setDocError('Choose a file');

    setUploading(true);
    try {
      await uploadDocument(newType, newTitle.trim(), newFile);
      setNewType('');
      setNewTitle('');
      setNewFile(null);
      (e.target as HTMLFormElement).reset();
      await loadDocs();
    } catch (err) {
      setDocError(getApiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleReupload = async (doc: MyDocument, file: File | null) => {
    if (!file) return;
    setDocError(null);
    setReuploadingId(doc.id);
    try {
      await reuploadDocument(doc.id, doc.documentType, doc.title, file);
      await loadDocs();
    } catch (err) {
      setDocError(getApiErrorMessage(err));
    } finally {
      setReuploadingId(null);
    }
  };

  const handleView = async (doc: MyDocument) => {
    // Open the tab first so mobile popup blockers allow it, then point it at the signed URL
    const tab = window.open('', '_blank');
    try {
      const full = await getDocument(doc.id);
      if (tab) tab.location.href = full.signedUrl;
      else window.location.href = full.signedUrl;
    } catch (err) {
      tab?.close();
      setDocError(getApiErrorMessage(err));
    }
  };

  // ---------- Change password ----------
  const [pwError, setPwError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onChangePassword = async (values: ChangePasswordFormValues) => {
    setPwError(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      // Backend revokes all sessions on password change, so sign out cleanly
      await logout();
    } catch (err) {
      setPwError(getApiErrorMessage(err));
    }
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="space-y-8 p-4">
        <h1 className="text-lg font-semibold text-slate-900">Profile</h1>

        {/* Account info */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Account</h2>
            <StatusPill status={user.registrationStatus} />
          </div>

          {user.registrationStatus === 'REJECTED' && user.rejectionReason ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Registration rejected: {user.rejectionReason}
            </p>
          ) : null}
          {user.registrationStatus === 'PENDING' ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Your registration is awaiting admin review. Make sure your documents are uploaded below.
            </p>
          ) : null}

          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm">
            {[
              ['Name', `${user.firstName} ${user.lastName}`],
              ['Email', user.email],
              ['Phone', user.phone],
              ['Telegram', user.telegramUsername ? `@${user.telegramUsername.replace(/^@/, '')}` : '—'],
              ['Address', user.address ?? '—'],
              ['Member since', new Date(user.createdAt).toLocaleDateString()],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Documents */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Registration documents</h2>

          {docsLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : latestDocs.length === 0 ? (
            <p className="text-sm text-slate-500">No documents uploaded yet.</p>
          ) : (
            <ul className="space-y-3">
              {latestDocs.map((doc) => (
                <li key={doc.id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{doc.title}</p>
                      <p className="text-xs text-slate-500">
                        {DOC_TYPE_LABELS[doc.documentType]} · v{doc.version}
                      </p>
                    </div>
                    <StatusPill status={doc.status} />
                  </div>

                  {doc.status === 'REJECTED' && doc.rejectionReason ? (
                    <p className="text-sm text-red-700">Reason: {doc.rejectionReason}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => handleView(doc)}>
                      View
                    </Button>

                    {doc.status === 'REJECTED' ? (
                      <label className="text-sm text-slate-700">
                        <span className="mr-2">
                          {reuploadingId === doc.id ? 'Uploading...' : 'Upload corrected file:'}
                        </span>
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/jpg,image/png"
                          disabled={reuploadingId === doc.id}
                          className="text-xs"
                          onChange={(e) => handleReupload(doc, e.target.files?.[0] ?? null)}
                        />
                      </label>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleUpload} className="space-y-3 rounded-xl border border-dashed border-slate-300 p-4">
            <p className="text-sm font-medium text-slate-900">Upload a document</p>

            <div className="space-y-1.5">
              <Label htmlFor="docType">Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType((v ?? '') as DocumentType | '')}>
                <SelectTrigger id="docType" className="w-full">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DOC_TYPE_LABELS) as DocumentType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {DOC_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="docTitle">Title</Label>
              <Input
                id="docTitle"
                placeholder="Business License 2026"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="docFile">File (PDF, JPG, or PNG, max 5MB)</Label>
              <Input
                id="docFile"
                type="file"
                accept="application/pdf,image/jpeg,image/jpg,image/png"
                onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {docError ? <p className="text-sm text-red-600">{docError}</p> : null}

            <Button type="submit" className="w-full" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </form>
        </section>

        {/* Change password */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Change password</h2>
          <form
            onSubmit={handleSubmit(onChangePassword)}
            noValidate
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...register('currentPassword')}
              />
              {errors.currentPassword ? (
                <p className="text-sm text-red-600">{errors.currentPassword.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...register('newPassword')}
              />
              {errors.newPassword ? (
                <p className="text-sm text-red-600">{errors.newPassword.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword ? (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              ) : null}
            </div>

            {pwError ? <p className="text-sm text-red-600">{pwError}</p> : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Change password'}
            </Button>
            <p className="text-xs text-slate-500">You&apos;ll be signed out and need to log in again.</p>
          </form>
        </section>
      </div>
    </AppShell>
  );
}