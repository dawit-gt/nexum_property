import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { UPLOAD_LIMITS } from '../constants/storage.constants';

/**
 * memoryStorage() is deliberate: the file buffer goes straight from the
 * request into Supabase Storage and is never written to local disk.
 */
export const multerOptions = {
  storage: memoryStorage(),
  limits: { fileSize: UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (
      !UPLOAD_LIMITS.ALLOWED_MIME_TYPES.includes(
        file.mimetype as (typeof UPLOAD_LIMITS.ALLOWED_MIME_TYPES)[number],
      )
    ) {
      callback(
        new BadRequestException(
          `Unsupported file type "${file.mimetype}". Allowed: PDF, JPG, JPEG, PNG.`,
        ),
        false,
      );
      return;
    }
    callback(null, true);
  },
};
