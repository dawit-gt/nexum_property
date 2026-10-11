import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

import { tokenStorage } from './token-storage';

import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  AuthTokens,
} from '@/types/api';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// --- Refresh queueing: if several requests 401 at once (e.g. a page that
// fires 3 parallel fetches right as the token expires), only the FIRST
// triggers a refresh call; the rest wait for that same refresh to finish
// and then retry with the new token. Without this, concurrent 401s would
// each call /auth/refresh, and the backend's rotation logic would treat
// all but the first as a reused/stolen token and revoke every session.
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function onRefreshed(token: string | null) {
  refreshQueue.forEach((callback) => callback(token));
  refreshQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest =
      error.config as
        | (InternalAxiosRequestConfig & {
            _retry?: boolean;
          })
        | undefined;

    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((newToken) => {
          if (!newToken) {
            reject(error);
            return;
          }

          originalRequest.headers.Authorization =
            `Bearer ${newToken}`;

          resolve(apiClient(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      tokenStorage.clear();
      isRefreshing = false;

      return Promise.reject(error);
    }

    try {
      const { data } =
        await axios.post<ApiSuccessResponse<AuthTokens>>(
          `${API_URL}/auth/refresh`,
          { refreshToken },
        );

      tokenStorage.setTokens(
        data.data.accessToken,
        data.data.refreshToken,
      );

      onRefreshed(data.data.accessToken);

      originalRequest.headers.Authorization =
        `Bearer ${data.data.accessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      tokenStorage.clear();
      onRefreshed(null);

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

/** Unwraps the backend's { success, data } envelope so call sites just get T. */
export async function apiGet<T>(
  url: string,
  params?: object,
): Promise<T> {
  const { data } =
    await apiClient.get<ApiSuccessResponse<T>>(url, {
      params,
    });

  return data.data;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
): Promise<T> {
  const { data } =
    await apiClient.post<ApiSuccessResponse<T>>(
      url,
      body,
    );

  return data.data;
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
): Promise<T> {
  const { data } =
    await apiClient.patch<ApiSuccessResponse<T>>(
      url,
      body,
    );

  return data.data;
}

export async function apiDelete<T>(
  url: string,
): Promise<T> {
  const { data } =
    await apiClient.delete<ApiSuccessResponse<T>>(url);

  return data.data;
}

/**
 * DELETE request with a JSON request body.
 *
 * Used by endpoints such as room photo removal where the backend
 * expects data in the DELETE request body.
 */
export async function apiDeleteWithBody<T>(
  url: string,
  body: unknown,
): Promise<T> {
  const { data } =
    await apiClient.delete<ApiSuccessResponse<T>>(
      url,
      {
        data: body,
      },
    );

  return data.data;
}

/**
 * For multipart/form-data uploads (payments, documents, room images, etc.).
 *
 * Content-Type is deliberately unset here — axios/the browser needs to set
 * it itself with the correct multipart boundary string when the body is a
 * FormData object; the apiClient instance's default 'application/json'
 * header would otherwise override that and break the upload.
 */
export async function apiPostForm<T>(
  url: string,
  formData: FormData,
): Promise<T> {
  const { data } =
    await apiClient.post<ApiSuccessResponse<T>>(
      url,
      formData,
      {
        headers: {
          'Content-Type': undefined,
        },
      },
    );

  return data.data;
}

/** Extracts a human-readable message from a failed request, for toasts/error display. */
export function getApiErrorMessage(
  error: unknown,
): string {
  if (
    axios.isAxiosError<ApiErrorResponse>(error) &&
    error.response?.data
  ) {
    const { message } = error.response.data;

    return Array.isArray(message)
      ? message.join(', ')
      : message;
  }

  return 'Something went wrong. Please try again.';
}