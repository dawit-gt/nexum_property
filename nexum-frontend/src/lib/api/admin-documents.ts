import { apiGet, apiPatch } from '../api-client';
import type { AdminDocument, DocumentWithSignedUrl, DocumentStatus } from '@/types/document';
import type { PaginatedResult } from '@/types/api';
import type { ListParams } from '@/types/list';

export type DocumentListParams = ListParams<DocumentStatus>;

export function listDocumentsForReview(params: DocumentListParams) {
  return apiGet<PaginatedResult<AdminDocument>>('/documents', params);
}

export function getDocument(id: string) {
  return apiGet<DocumentWithSignedUrl>(`/documents/${id}`);
}

export function reviewDocument(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
  return apiPatch(`/documents/${id}/review`, { status, rejectionReason });
}