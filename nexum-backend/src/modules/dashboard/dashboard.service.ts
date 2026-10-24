import { Injectable } from '@nestjs/common';
import {
  DocumentStatus,
  LeaseStatus,
  MaintenanceStatus,
  PaymentStatus,
  RegistrationStatus,
  RequestStatus,
  RoomStatus,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DueDateService } from '../due-date/due-date.service';
import {
  buildDateRange,
  startOfCurrentMonthAddis,
} from '../../common/utils/date-range.util';
import { ExportQueryDto } from './dto/export-query.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dueDateService: DueDateService,
  ) {}

  /**
   * The dashboard-load safety net (Master Plan Section 4 / 14): free
   * hosting can sleep or pause between the nightly cron runs, so every
   * time an admin actually opens the dashboard, the same due-date check
   * re-runs. It's already de-duplicated (Phase 8), so calling it here on
   * every dashboard load is cheap and safe, never double-alerts.
   */
  async getOverview() {
    await this.dueDateService.runDailyCheck();

    const [occupancy, payments, users, pendingActions, thisMonth] =
      await Promise.all([
        this.getOccupancySplit(),
        this.getPaymentStatusSplit(),
        this.getUserStatusSplit(),
        this.getPendingActions(),
        this.getThisMonthPayments(),
      ]);

    return { occupancy, payments, users, pendingActions, thisMonth };
  }

  /**
   * Approved payment totals grouped by calendar month (Addis Ababa).
   * Returns the last `months` months (default 6), oldest first.
   */
  async getMonthlyIncome(months = 6) {
    const clamped = Math.min(24, Math.max(1, months));
    const from = startOfCurrentMonthAddis();
    from.setMonth(from.getMonth() - (clamped - 1));

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.APPROVED,
        paymentDate: { gte: from },
      },
      select: { amount: true, paymentDate: true },
      orderBy: { paymentDate: 'asc' },
    });

    // Bucket by YYYY-MM in Addis time
    const buckets = new Map<string, number>();
    for (let i = 0; i < clamped; i++) {
      const d = new Date(from);
      d.setMonth(from.getMonth() + i);
      const key = d.toLocaleDateString('en-CA', {
        timeZone: 'Africa/Addis_Ababa',
        year: 'numeric',
        month: '2-digit',
      });
      buckets.set(key, 0);
    }

    for (const p of payments) {
      const key = p.paymentDate.toLocaleDateString('en-CA', {
        timeZone: 'Africa/Addis_Ababa',
        year: 'numeric',
        month: '2-digit',
      });
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + Number(p.amount));
      }
    }

    return Array.from(buckets.entries()).map(([month, total]) => ({
      month,
      total,
    }));
  }

  private async getOccupancySplit() {
    const counts = await this.prisma.room.groupBy({
      by: ['status'],
      _count: true,
    });
    return this.fillZeros(counts, Object.values(RoomStatus));
  }

  private async getPaymentStatusSplit() {
    const counts = await this.prisma.payment.groupBy({
      by: ['status'],
      _count: true,
    });
    return this.fillZeros(counts, Object.values(PaymentStatus));
  }

  private async getUserStatusSplit() {
    const counts = await this.prisma.user.groupBy({
      by: ['status'],
      _count: true,
    });
    return this.fillZeros(counts, Object.values(UserStatus));
  }

  private async getPendingActions() {
    const [
      pendingRegistrations,
      pendingDocuments,
      pendingPayments,
      pendingRoomRequests,
      pendingMaintenance,
      unreadMessages,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { registrationStatus: RegistrationStatus.PENDING },
      }),
      this.prisma.document.count({
        where: { status: DocumentStatus.PENDING },
      }),
      this.prisma.payment.count({
        where: { status: PaymentStatus.PENDING },
      }),
      this.prisma.roomRequest.count({
        where: { status: RequestStatus.PENDING },
      }),
      this.prisma.maintenanceRequest.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.messageRecipient.count({
        where: { isRead: false, recipient: { role: 'ADMIN' } },
      }),
    ]);

    return {
      pendingRegistrations,
      pendingDocuments,
      pendingPayments,
      pendingRoomRequests,
      pendingMaintenance,
      unreadMessages,
      total:
        pendingRegistrations +
        pendingDocuments +
        pendingPayments +
        pendingRoomRequests +
        pendingMaintenance +
        unreadMessages,
    };
  }

  /**
   * Approved payments whose paymentDate falls in the current Addis Ababa
   * calendar month. amount is a Decimal, so we convert to number for the
   * JSON response.
   */
  private async getThisMonthPayments() {
    const from = startOfCurrentMonthAddis();

    const result = await this.prisma.payment.aggregate({
      where: {
        status: PaymentStatus.APPROVED,
        paymentDate: { gte: from },
      },
      _sum: { amount: true },
      _count: true,
    });

    return {
      totalAmount: result._sum.amount ? Number(result._sum.amount) : 0,
      count: result._count,
    };
  }

  /** groupBy only returns rows that exist — this fills in 0 for statuses with no rows, so the chart never has a missing category. */
  private fillZeros(
    counts: { status: string; _count: number }[],
    allStatuses: string[],
  ): Record<string, number> {
    const result: Record<string, number> = Object.fromEntries(
      allStatuses.map((s) => [s, 0]),
    );
    for (const row of counts) {
      result[row.status] = row._count;
    }
    return result;
  }

  // ---------- CSV exports ----------

  async exportPaymentsCsv(query: ExportQueryDto): Promise<string> {
    const { status, search, dateFrom, dateTo } = query;
    const createdAt = buildDateRange(dateFrom, dateTo);
    const effectiveStatus =
      status === 'ALL' ? undefined : (status as PaymentStatus | undefined);

    const where = {
      ...(effectiveStatus ? { status: effectiveStatus } : {}),
      ...(createdAt ? { createdAt } : {}),
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

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        room: { select: { roomNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = [
      'Payment Number',
      'Tenant',
      'Email',
      'Room',
      'Amount',
      'Currency',
      'Months Covered',
      'Period Start',
      'Period End',
      'Payment Date',
      'Status',
    ].join(',');

    const rows = payments.map((p) =>
      [
        p.paymentNumber,
        `"${p.user.firstName} ${p.user.lastName}"`,
        p.user.email,
        p.room.roomNumber,
        p.amount.toString(),
        p.currency,
        p.monthsCovered,
        p.periodStartDate.toISOString().slice(0, 10),
        p.periodEndDate.toISOString().slice(0, 10),
        p.paymentDate.toISOString().slice(0, 10),
        p.status,
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  async exportLeasesCsv(query: ExportQueryDto): Promise<string> {
    const { status, search, dateFrom, dateTo } = query;
    const createdAt = buildDateRange(dateFrom, dateTo);

    const where = {
      ...(status && status !== 'ALL' ? { status: status as LeaseStatus } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              {
                leaseNumber: {
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

    const leases = await this.prisma.lease.findMany({
      where,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        room: { select: { roomNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = [
      'Lease Number',
      'Tenant',
      'Email',
      'Room',
      'Monthly Rent',
      'Start Date',
      'End Date',
      'Status',
      'Termination Date',
      'Termination Reason',
    ].join(',');

    const rows = leases.map((l) =>
      [
        l.leaseNumber,
        `"${l.user.firstName} ${l.user.lastName}"`,
        l.user.email,
        l.room.roomNumber,
        l.monthlyRent.toString(),
        l.startDate.toISOString().slice(0, 10),
        l.endDate.toISOString().slice(0, 10),
        l.status,
        l.terminationDate
          ? l.terminationDate.toISOString().slice(0, 10)
          : '',
        l.terminationReason
          ? `"${l.terminationReason.replace(/"/g, '""')}"`
          : '',
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  async exportMaintenanceCsv(query: ExportQueryDto): Promise<string> {
    const { status, search, dateFrom, dateTo } = query;
    const createdAt = buildDateRange(dateFrom, dateTo);

    const where = {
      ...(status && status !== 'ALL'
        ? { status: status as MaintenanceStatus }
        : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              {
                ticketNumber: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                issueTitle: {
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
            ],
          }
        : {}),
    };

    const tickets = await this.prisma.maintenanceRequest.findMany({
      where,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        room: { select: { roomNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = [
      'Ticket Number',
      'Tenant',
      'Email',
      'Room',
      'Issue Title',
      'Description',
      'Status',
      'Admin Notes',
      'Reported At',
      'Resolved At',
    ].join(',');

    const rows = tickets.map((t) =>
      [
        t.ticketNumber,
        `"${t.user.firstName} ${t.user.lastName}"`,
        t.user.email,
        t.room?.roomNumber ?? '',
        `"${t.issueTitle.replace(/"/g, '""')}"`,
        `"${t.description.replace(/"/g, '""')}"`,
        t.status,
        t.adminNotes
          ? `"${t.adminNotes.replace(/"/g, '""')}"`
          : '',
        t.createdAt.toISOString().slice(0, 10),
        t.resolvedAt ? t.resolvedAt.toISOString().slice(0, 10) : '',
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }
}
