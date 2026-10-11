import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

/**
 * Every file Nexum handles — documents, receipts, room/maintenance images —
 * goes through this service into a PRIVATE Supabase Storage bucket. Never
 * write to local disk (Render's free tier filesystem is ephemeral and
 * wipes on every restart — Master Plan Section 4A), and never use a public
 * bucket for anything containing tenant documents or payment receipts.
 */
@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly client: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (url && serviceKey) {
      this.client = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    } else {
      this.logger.warn(
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — file uploads will fail until configured.',
      );
    }
  }

  /**
   * Builds a non-guessable storage path (Master Plan Section 18): a random
   * UUID prefix, not the original filename, so a leaked/guessed URL can't
   * be used to enumerate other tenants' documents.
   */
  buildSecurePath(folder: string, originalFilename: string): string {
    const ext = originalFilename.split('.').pop()?.toLowerCase() || 'bin';
    return `${folder}/${randomUUID()}.${ext}`;
  }

  async upload(
    bucket: string,
    path: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    this.assertConfigured();

    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Upload failed [${bucket}/${path}]: ${error.message}`);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  /**
   * Time-limited signed URL — the only way private files are ever served.
   */
  async getSignedUrl(
    bucket: string,
    path: string,
    expiresInSeconds: number,
  ): Promise<string> {
    this.assertConfigured();

    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data) {
      this.logger.error(
        `Signed URL failed [${bucket}/${path}]: ${error?.message}`,
      );

      throw new InternalServerErrorException(
        'Could not generate a file access link',
      );
    }

    return data.signedUrl;
  }

  /**
   * For PUBLIC buckets only (room images) — no signed URL needed, this is
   * a synchronous string build, not an API call.
   */
  getPublicUrl(bucket: string, path: string): string {
    this.assertConfigured();

    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async delete(bucket: string, path: string): Promise<void> {
    this.assertConfigured();

    const { error } = await this.client.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      this.logger.error(
        `Delete failed [${bucket}/${path}]: ${error.message}`,
      );
    }
  }

  private assertConfigured(): void {
    if (!this.client) {
      throw new InternalServerErrorException(
        'File storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)',
      );
    }
  }
}
