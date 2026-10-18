import { z } from 'zod';

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60, 'Too long'),
  lastName: z.string().trim().min(1, 'Last name is required').max(60, 'Too long'),
  phone: z
    .string()
    .trim()
    .regex(/^\+\d{7,15}$/, 'Use international format, e.g. +251911223344'),
  address: z.string().trim().max(200, 'Too long').optional(),
  telegramUsername: z.string().trim().max(64, 'Too long').optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const changeEmailSchema = z.object({
  newEmail: z.string().trim().email('Enter a valid email address'),
  currentPassword: z.string().min(1, 'Enter your current password'),
});

export type ChangeEmailFormValues = z.infer<typeof changeEmailSchema>;