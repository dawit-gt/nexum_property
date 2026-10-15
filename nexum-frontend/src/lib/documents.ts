import { apiGet, apiPostForm } from '../api-client';
import type { DocumentType, MyDocument } from '@/types/document';

export function listMyDocuments() {
  return apiGet<MyDocument[]>('/documents/mine');
}

export function uploadDocument(documentType: DocumentType, title: string, file: File) {
  const form = new FormData();
  form.append('documentType', documentType);
  form.append('title', title);
  form.append('file', file);
  return apiPostForm<MyDocument>('/documents', form);
}

export function reuploadDocument(id: string, documentType: DocumentType, title: string, file: File) {
  const form = new FormData();
  form.append('documentType', documentType);
  form.append('title', title);
  form.append('file', file);
  return apiPostForm<MyDocument>(`/documents/${id}/reupload`, form);
}