import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class SmsService {
  /**
   * Builds a pre-filled sms: link. `?body=` is the widely-supported form
   * across Android and modern iOS — this never actually sends anything,
   * it just opens the device's own SMS app with the message ready to go.
   */
  buildSmsLink(phone: string, message: string): string {
    return `sms:${phone}?body=${encodeURIComponent(message)}`;
  }

  /**
   * QR code encoding the same sms: link, as a base64 PNG data URL a
   * frontend can render directly in an <img> tag — the fallback for an
   * admin working from a desktop, who can scan it with their own phone
   * (Master Plan Section 12).
   */
  async generateQrCodeDataUrl(smsLink: string): Promise<string> {
    return QRCode.toDataURL(smsLink, { width: 300, margin: 2 });
  }
}
