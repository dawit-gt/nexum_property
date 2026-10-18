'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserAvatar } from '@/components/profile/user-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { getApiErrorMessage } from '@/lib/api-client';
import { removeAvatar, updateProfile, uploadAvatar } from '@/lib/api/profile';
import { profileSchema, type ProfileFormValues } from '@/lib/validations/profile';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-red-600">{message}</p> : null;
}

export function ProfileDetailsCard() {
  const { user, refreshUser } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  if (!user) return null;

  const startEditing = () => {
    reset({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      address: user.address ?? '',
      telegramUsername: user.telegramUsername ?? '',
    });
    setServerError(null);
    setSaved(false);
    setEditing(true);
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setServerError(null);
    try {
      await updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        address: values.address ?? '',
        telegramUsername: values.telegramUsername ?? '',
      });
      await refreshUser();
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  };

  const handlePhotoChosen = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);

    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Choose a JPG or PNG image.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('The photo must be 5MB or smaller.');
      return;
    }

    setPhotoBusy(true);
    try {
      await uploadAvatar(file);
      await refreshUser();
    } catch (err) {
      setPhotoError(getApiErrorMessage(err));
    } finally {
      setPhotoBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      await removeAvatar();
      await refreshUser();
    } catch (err) {
      setPhotoError(getApiErrorMessage(err));
    } finally {
      setPhotoBusy(false);
    }
  };

  const rows: [string, string][] = [
    ['Name', `${user.firstName} ${user.lastName}`],
    ['Email', user.email],
    ['Phone', user.phone],
    ['Telegram', user.telegramUsername ? `@${user.telegramUsername.replace(/^@/, '')}` : '—'],
    ['Address', user.address ?? '—'],
    ['Member since', new Date(user.createdAt).toLocaleDateString()],
  ];

  return (
    <div className="space-y-4">
      {/* Photo */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <UserAvatar size={64} />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={photoBusy}
              onClick={() => fileInput.current?.click()}
            >
              {photoBusy ? 'Please wait...' : user.avatarUrl ? 'Change photo' : 'Add photo'}
            </Button>
            {user.avatarUrl ? (
              <Button type="button" variant="ghost" size="sm" disabled={photoBusy} onClick={handleRemovePhoto}>
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">JPG or PNG, up to 5MB. Optional.</p>
          <FieldError message={photoError ?? undefined} />
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => handlePhotoChosen(e.target.files?.[0])}
        />
      </div>

      {/* Details */}
      {editing ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" autoComplete="given-name" {...register('firstName')} />
              <FieldError message={errors.firstName?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" autoComplete="family-name" {...register('lastName')} />
              <FieldError message={errors.lastName?.message} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" {...register('phone')} />
            <FieldError message={errors.phone?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telegramUsername">Telegram username (optional)</Label>
            <Input id="telegramUsername" placeholder="abebe_k" {...register('telegramUsername')} />
            <FieldError message={errors.telegramUsername?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address (optional)</Label>
            <Input id="address" autoComplete="street-address" {...register('address')} />
            <FieldError message={errors.address?.message} />
          </div>

          <FieldError message={serverError ?? undefined} />

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>

          {saved ? <p className="text-sm text-green-700">Your details were updated.</p> : null}

          <Button type="button" variant="outline" className="w-full" onClick={startEditing}>
            Edit details
          </Button>
        </>
      )}
    </div>
  );
}