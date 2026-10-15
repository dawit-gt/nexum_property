export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type UserRole = 'ADMIN' | 'USER';
export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface SafeUser {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  telegramUsername: string | null;
  role: UserRole;
  status: UserStatus;
  registrationStatus: RegistrationStatus;
  rejectionReason: string | null;
  avatarUrl: string | null;
  address: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}