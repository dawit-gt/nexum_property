/**
 * Private Supabase Storage buckets (Master Plan Section 21). Create these
 * in the Supabase dashboard as PRIVATE buckets before Phase 2 files will
 * actually upload — see SETUP.md.
 */
export const STORAGE_BUCKETS = {
  PROPERTY_DOCUMENTS: 'property-documents',
  PAYMENT_RECEIPTS: 'payment-receipts',
  ROOM_IMAGES: 'room-images',
  MAINTENANCE_IMAGES: 'maintenance-images',
} as const;

/**
 * Backend-enforced upload limits (Master Plan Section 18) — never rely on
 * frontend validation alone. Applied both at the multer layer (fast
 * rejection) and again in the service layer (defense in depth).
 */
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ] as const,
};

/** Default signed-URL lifetime for private document access. */
export const SIGNED_URL_EXPIRY_SECONDS = 60 * 10; // 10 minutes
