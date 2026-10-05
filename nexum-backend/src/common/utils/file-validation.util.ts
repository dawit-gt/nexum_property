import { BadRequestException } from '@nestjs/common';
import { UPLOAD_LIMITS } from '../constants/storage.constants';

export function assertValidUpload(file: {
  mimetype: string;
  size: number;
}): void {
  if (
    !UPLOAD_LIMITS.ALLOWED_MIME_TYPES.includes(
      file.mimetype as (typeof UPLOAD_LIMITS.ALLOWED_MIME_TYPES)[number],
    )
  ) {
    throw new BadRequestException(
      `Unsupported file type "${file.mimetype}". Allowed: PDF, JPG, JPEG, PNG.`,
    );
  }
  if (file.size > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
    throw new BadRequestException(
      `File is too large (max ${UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB).`,
    );
  }
}
