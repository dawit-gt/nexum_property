import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AuditAction,
  DocumentStatus,
  DocumentType,
  NotificationChannel,
  NotificationType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { SupabaseStorageService } from '../../common/services/supabase-storage.service';

import {
  SIGNED_URL_EXPIRY_SECONDS,
  STORAGE_BUCKETS,
} from '../../common/constants/storage.constants';

import { assertValidUpload } from '../../common/utils/file-validation.util';

import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

type UploadedFile = Express.Multer.File;

const DOCUMENT_SELECT = {
  id: true,
  userId: true,
  documentType: true,
  title: true,
  fileType: true,
  fileSizeBytes: true,
  version: true,
  previousVersionId: true,
  status: true,
  rejectionReason: true,
  reviewedByUserId: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  // filePath deliberately excluded — internal storage key, not for the
  // frontend directly. Signed URLs are generated on demand instead.
} as const;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async upload(
    userId: string,
    documentType: DocumentType,
    title: string,
    file: UploadedFile,
  ) {
    assertValidUpload(file);

    const path = this.storage.buildSecurePath(
      `documents/${userId}`,
      file.originalname,
    );

    await this.storage.upload(
      STORAGE_BUCKETS.PROPERTY_DOCUMENTS,
      path,
      file.buffer,
      file.mimetype,
    );

    try {
      return await this.prisma.document.create({
        data: {
          userId,
          documentType,
          title,
          filePath: path,
          fileType: file.mimetype,
          fileSizeBytes: file.size,
          version: 1,
          status: DocumentStatus.PENDING,
        },
        select: DOCUMENT_SELECT,
      });
    } catch (error) {
      // Rollback orphaned file if DB creation fails
      await this.storage.delete(
        STORAGE_BUCKETS.PROPERTY_DOCUMENTS,
        path,
      );
      throw error;
    }
  }

  /**
   * Replaces a rejected document with a corrected upload. The old row is
   * kept as-is; the new row links back via previousVersionId.
   */
  async reupload(
    userId: string,
    documentId: string,
    title: string,
    file: UploadedFile,
  ) {
    const previous = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        nextVersion: {
          select: { id: true },
        },
      },
    });

    if (!previous) {
      throw new NotFoundException('Document not found');
    }

    if (previous.userId !== userId) {
      throw new ForbiddenException('This is not your document');
    }

    if (previous.status !== DocumentStatus.REJECTED) {
      throw new BadRequestException(
        'Only a rejected document can be replaced with a new version',
      );
    }

    if (previous.nextVersion) {
      throw new BadRequestException(
        'This document has already been superseded by a newer version',
      );
    }

    assertValidUpload(file);

    const path = this.storage.buildSecurePath(
      `documents/${userId}`,
      file.originalname,
    );

    await this.storage.upload(
      STORAGE_BUCKETS.PROPERTY_DOCUMENTS,
      path,
      file.buffer,
      file.mimetype,
    );

    try {
      return await this.prisma.document.create({
        data: {
          userId,
          documentType: previous.documentType,
          title,
          filePath: path,
          fileType: file.mimetype,
          fileSizeBytes: file.size,
          version: previous.version + 1,
          previousVersionId: previous.id,
          status: DocumentStatus.PENDING,
        },
        select: DOCUMENT_SELECT,
      });
    } catch (error) {
      // Rollback orphaned file if DB creation fails
      await this.storage.delete(
        STORAGE_BUCKETS.PROPERTY_DOCUMENTS,
        path,
      );
      throw error;
    }
  }

  async listMine(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      select: DOCUMENT_SELECT,
      orderBy: [
        { documentType: 'asc' },
        { version: 'desc' },
      ],
    });
  }

  async listForReview(status?: DocumentStatus) {
    return this.prisma.document.findMany({
      where: {
        status: status ?? DocumentStatus.PENDING,
      },
      select: {
        ...DOCUMENT_SELECT,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOneWithAccessCheck(
    documentId: string,
    requester: { id: string; role: string },
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (
      requester.role !== 'ADMIN' &&
      document.userId !== requester.id
    ) {
      throw new ForbiddenException(
        'You cannot access this document',
      );
    }

    const signedUrl = await this.storage.getSignedUrl(
      STORAGE_BUCKETS.PROPERTY_DOCUMENTS,
      document.filePath,
      SIGNED_URL_EXPIRY_SECONDS,
    );

    const { filePath: _filePath, ...safe } = document;

    return {
      ...safe,
      signedUrl,
      signedUrlExpiresInSeconds: SIGNED_URL_EXPIRY_SECONDS,
    };
  }

  async review(
    documentId: string,
    adminId: string,
    status:
      | typeof DocumentStatus.APPROVED
      | typeof DocumentStatus.REJECTED,
    rejectionReason?: string,
  ) {
    if (
      status === DocumentStatus.REJECTED &&
      !rejectionReason?.trim()
    ) {
      throw new BadRequestException(
        'A rejection reason is required when rejecting a document',
      );
    }

    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.status !== DocumentStatus.PENDING) {
      throw new BadRequestException(
        `Document has already been reviewed (status: ${document.status})`,
      );
    }

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status,
        rejectionReason:
          status === DocumentStatus.REJECTED
            ? rejectionReason
            : null,
        reviewedByUserId: adminId,
        reviewedAt: new Date(),
      },
      select: DOCUMENT_SELECT,
    });

    await this.audit.log({
      actorId: adminId,
      action:
        status === DocumentStatus.APPROVED
          ? AuditAction.APPROVE
          : AuditAction.REJECT,
      entityType: 'DOCUMENT',
      entityId: documentId,
      newValue: {
        status,
        rejectionReason,
      },
    });

    await this.notifications.send({
      userId: document.userId,
      type: NotificationType.DOCUMENT,
      title:
        status === DocumentStatus.APPROVED
          ? 'Document approved'
          : 'Document rejected',
      content:
        status === DocumentStatus.APPROVED
          ? `Your document "${document.title}" has been approved.`
          : `Your document "${document.title}" was rejected: ${rejectionReason}`,
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
      ],
    });

    return updated;
  }
}
