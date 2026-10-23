import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AuditAction,
  LeaseStatus,
  NotificationChannel,
  NotificationType,
  PaymentStatus,
  RegistrationStatus,
} from '@prisma/client';

import { randomBytes } from 'crypto';

import { PrismaService } from '../../database/prisma.service';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';
import {
  SIGNED_URL_EXPIRY_SECONDS,
  STORAGE_BUCKETS,
} from '../../common/constants/storage.constants';
import { assertValidUpload } from '../../common/utils/file-validation.util';
import { addMonthsMinusOneDay, addOneDay } from '../../common/utils/date.util';

import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';

import { paginate } from '../../common/utils/paginate.util';
import { buildDateRange } from '../../common/utils/date-range.util';

type UploadedFile = Express.Multer.File;

function generatePaymentNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString('hex').toUpperCase();

  return `PMT-${stamp}-${rand}`;
}

const PAYMENT_SELECT = {
  id: true,
  paymentNumber: true,
  userId: true,
  leaseId: true,
  roomId: true,
  amount: true,
  currency: true,
  monthsCovered: true,
  periodStartDate: true,
  periodEndDate: true,
  paymentDate: true,
  paymentMethod: true,
  referenceNumber: true,
  status: true,
  rejectionReason: true,
  note: true,
  approvedByUserId: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,

  // receiptPath deliberately excluded — internal storage key; signed URLs
  // are generated on demand via findOneWithAccessCheck.
} as const;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async create(
    userId: string,
    dto: CreatePaymentDto,
    file: UploadedFile,
  ) {
    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (
      requester?.registrationStatus !==
      RegistrationStatus.APPROVED
    ) {
      throw new ForbiddenException(
        'Your registration must be approved before you can submit a payment',
      );
    }

    const lease = await this.prisma.lease.findUnique({
      where: { id: dto.leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (lease.userId !== userId) {
      throw new ForbiddenException(
        'This is not your lease',
      );
    }

    if (lease.status !== LeaseStatus.ACTIVE) {
      throw new BadRequestException(
        `Payments can only be submitted against an ACTIVE lease (current status: ${lease.status})`,
      );
    }

    // Base the next coverage period on the latest APPROVED payment for this
    // lease — pending/rejected payments don't extend coverage, so this can
    // never double-count a period that hasn't actually been confirmed yet.
    const lastApproved =
      await this.prisma.payment.findFirst({
        where: {
          leaseId: dto.leaseId,
          status: PaymentStatus.APPROVED,
        },
        orderBy: {
          periodEndDate: 'desc',
        },
      });

    const periodStartDate = lastApproved
      ? addOneDay(lastApproved.periodEndDate)
      : lease.startDate;

    const periodEndDate = addMonthsMinusOneDay(
      periodStartDate,
      dto.monthsCovered,
      lease.startDate.getUTCDate(),
    );

    assertValidUpload(file);

    const path = this.storage.buildSecurePath(
      `payments/${userId}`,
      file.originalname,
    );

    await this.storage.upload(
      STORAGE_BUCKETS.PAYMENT_RECEIPTS,
      path,
      file.buffer,
      file.mimetype,
    );

    try {
      const payment = await this.prisma.payment.create({
        data: {
          paymentNumber: generatePaymentNumber(),
          userId,
          leaseId: dto.leaseId,
          roomId: lease.roomId,
          amount: dto.amount,
          monthsCovered: dto.monthsCovered,
          periodStartDate,
          periodEndDate,
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: dto.paymentMethod,
          referenceNumber: dto.referenceNumber,
          receiptPath: path,
          note: dto.note,
          status: PaymentStatus.PENDING,
        },
        select: PAYMENT_SELECT,
      });

      await this.notifications.notifyAdmins({
        kind: 'payment',
        type: NotificationType.PAYMENT,
        title: 'New payment to review',
        content: `Payment ${payment.paymentNumber} was submitted and is waiting for review.`,
        actionUrl: '/admin/payments',
      });

      return payment;
    } catch (error) {
      // Roll back the orphaned file if the DB write fails.
      await this.storage.delete(
        STORAGE_BUCKETS.PAYMENT_RECEIPTS,
        path,
      );

      throw error;
    }
  }

  async findMine(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      select: PAYMENT_SELECT,
      orderBy: { paymentDate: 'desc' },
    });
  }

  async findForReview(query: ListPaymentsQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const effectiveStatus =
      status === 'ALL' ? undefined : (status ?? PaymentStatus.PENDING);
    const submittedBetween = buildDateRange(dateFrom, dateTo);

    const where = {
      ...(effectiveStatus ? { status: effectiveStatus } : {}),
      ...(submittedBetween ? { createdAt: submittedBetween } : {}),
      ...(search
        ? {
            OR: [
              {
                paymentNumber: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                room: {
                  roomNumber: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                user: {
                  firstName: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                user: {
                  lastName: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                user: {
                  email: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.payment.findMany({
          where,
          select: {
            ...PAYMENT_SELECT,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            room: {
              select: {
                id: true,
                roomNumber: true,
              },
            },
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          skip,
          take: limit,
        }),
        this.prisma.payment.count({
          where,
        }),
      ]);

    return paginate(
      data,
      total,
      page,
      limit,
    );
  }

  async findOneWithAccessCheck(
    id: string,
    requester: { id: string; role: string },
  ) {
    const payment =
      await this.prisma.payment.findUnique({
        where: { id },
      });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (
      requester.role !== 'ADMIN' &&
      payment.userId !== requester.id
    ) {
      throw new ForbiddenException(
        'You cannot access this payment',
      );
    }

    const signedUrl =
      await this.storage.getSignedUrl(
        STORAGE_BUCKETS.PAYMENT_RECEIPTS,
        payment.receiptPath,
        SIGNED_URL_EXPIRY_SECONDS,
      );

    const {
      receiptPath: _receiptPath,
      ...safe
    } = payment;

    return {
      ...safe,
      signedUrl,
      signedUrlExpiresInSeconds:
        SIGNED_URL_EXPIRY_SECONDS,
    };
  }

  async review(
    id: string,
    adminId: string,
    status:
      | typeof PaymentStatus.APPROVED
      | typeof PaymentStatus.REJECTED,
    rejectionReason?: string,
  ) {
    const payment =
      await this.prisma.payment.findUnique({
        where: { id },
      });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Payment has already been reviewed (status: ${payment.status})`,
      );
    }

    const updated =
      await this.prisma.payment.update({
        where: { id },
        data: {
          status,
          rejectionReason:
            status === PaymentStatus.REJECTED
              ? rejectionReason
              : null,
          approvedByUserId: adminId,
          approvedAt: new Date(),
        },
        select: PAYMENT_SELECT,
      });

    await this.audit.log({
      actorId: adminId,
      action:
        status === PaymentStatus.APPROVED
          ? AuditAction.APPROVE
          : AuditAction.REJECT,
      entityType: 'PAYMENT',
      entityId: id,
      newValue: {
        status,
        rejectionReason,
      },
    });

    await this.notifications.send({
      userId: payment.userId,
      type: NotificationType.PAYMENT,
      title:
        status === PaymentStatus.APPROVED
          ? 'Payment approved'
          : 'Payment rejected',
      content:
        status === PaymentStatus.APPROVED
          ? `Your payment ${payment.paymentNumber} covering ${payment.monthsCovered} month(s) has been approved.`
          : `Your payment ${payment.paymentNumber} was rejected: ${rejectionReason}`,
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
      ],
    });

    return updated;
  }
}