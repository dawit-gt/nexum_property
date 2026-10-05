import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Usage: @Roles(UserRole.ADMIN)
 * Read by RolesGuard. An endpoint with no @Roles() decorator is accessible
 * to any authenticated user (still gated by JwtAuthGuard).
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
