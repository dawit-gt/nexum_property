import { createHash, randomBytes } from 'crypto';

/**
 * Refresh tokens and password-reset tokens are stored as SHA-256 hashes
 * (RefreshToken.tokenHash / PasswordResetToken.tokenHash) — never the raw
 * value. A leaked database dump then reveals no usable token, mirroring
 * how passwords are never stored in plaintext either.
 */
export function generateOpaqueToken(): string {
  return randomBytes(48).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
