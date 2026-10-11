import { apiGet, apiPatch } from '../api-client';
import type { AdminDocument, DocumentWithSignedUrl, DocumentStatus } from '@/types/document';

export function listDocumentsForReview(status?: DocumentStatus) {
  return apiGet<AdminDocument[]>('/documents', status ? { status } : undefined);
}

export function getDocument(id: string) {
  return apiGet<DocumentWithSignedUrl>(`/documents/${id}`);
}

export function reviewDocument(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
  return apiPatch(`/documents/${id}/review`, { status, rejectionReason });
}