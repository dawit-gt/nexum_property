import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Resend is primary (Master Plan Section 4C) — Gmail SMTP over nodemailer
 * is only a local-dev fallback since Gmail isn't reliable for automated
 * sending. Never throws: email is a side-channel for notifications, and a
 * misconfigured/failing email must never block the primary action
 * (approving a payment, reviewing a document, etc.) that triggered it.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend?: Resend;
  private readonly gmailTransport?: nodemailer.Transporter;
  private readonly fromAddress: string;
  private readonly mode: 'resend' | 'gmail' | 'none';

  constructor(private readonly config: ConfigService) {
    const resendKey = this.config.get<string>('RESEND_API_KEY');
    const gmailUser = this.config.get<string>('EMAIL_USER');
    const gmailPassword = this.config.get<string>('EMAIL_PASSWORD');

    if (resendKey) {
      this.resend = new Resend(resendKey);
      this.fromAddress = this.config.get<string>('EMAIL_FROM') ?? 'onboarding@resend.dev';
      this.mode = 'resend';
    } else if (gmailUser && gmailPassword) {
      this.gmailTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPassword },
      });
      this.fromAddress = gmailUser;
      this.mode = 'gmail';
      this.logger.warn('Using Gmail SMTP fallback — this is intended for local dev only, never production.');
    } else {
      this.mode = 'none';
      this.logger.warn('No email provider configured (RESEND_API_KEY or EMAIL_USER/EMAIL_PASSWORD) — emails will be skipped.');
    }
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      if (this.mode === 'resend') {
        const { error } = await this.resend!.emails.send({
          from: this.fromAddress,
          to: params.to,
          subject: params.subject,
          html: params.html,
        });
        if (error) {
          this.logger.error(`Resend error: ${error.message}`);
          return { success: false, error: error.message };
        }
        return { success: true };
      }

      if (this.mode === 'gmail') {
        await this.gmailTransport!.sendMail({
          from: this.fromAddress,
          to: params.to,
          subject: params.subject,
          html: params.html,
        });
        return { success: true };
      }

      return { success: false, error: 'No email provider configured' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Email send failed: ${message}`);
      return { success: false, error: message };
    }
  }
}
