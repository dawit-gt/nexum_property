import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Usage: @Public() on top of an endpoint (e.g. login, register, health).
 * JwtAuthGuard is applied globally (see AppModule) — this is the escape
 * hatch for the handful of routes that must work without a token.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
