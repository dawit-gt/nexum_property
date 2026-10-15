export type DocumentType = 'BUSINESS_LICENSE' | 'ESTABLISHMENT_DOC' | 'CLEARANCE' | 'AGREEMENT' | 'OTHER';
export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminDocument {
  id: string;
  userId: string;
  documentType: DocumentType;
  title: string;
  fileType: string;
  fileSizeBytes: number;
  version: number;
  previousVersionId: string | null;
  status: DocumentStatus;
  rejectionReason: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

export interface DocumentWithSignedUrl extends Omit<AdminDocument, 'user'> {
  signedUrl: string;
  signedUrlExpiresInSeconds: number;
  user?: { id: string; firstName: string; lastName: string; email: string };
}
export type MyDocument = Omit<AdminDocument, 'user'>;