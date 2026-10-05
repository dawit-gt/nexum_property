import { Injectable } from '@nestjs/common';
import { DocumentStatus, LeaseStatus, PaymentStatus, RegistrationStatus, RequestStatus, RoomStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DueDateService } from '../due-date/due-date.service';

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

    const [occupancy, payments, users, pendingActions] = await Promise.all([
      this.getOccupancySplit(),
      this.getPaymentStatusSplit(),
      this.getUserStatusSplit(),
      this.getPendingActions(),
    ]);

    return { occupancy, payments, users, pendingActions };
  }

  private async getOccupancySplit() {
    const counts = await this.prisma.room.groupBy({ by: ['status'], _count: true });
    return this.fillZeros(counts, Object.values(RoomStatus));
  }

  private async getPaymentStatusSplit() {
    const counts = await this.prisma.payment.groupBy({ by: ['status'], _count: true });
    return this.fillZeros(counts, Object.values(PaymentStatus));
  }

  private async getUserStatusSplit() {
    const counts = await this.prisma.user.groupBy({ by: ['status'], _count: true });
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
      this.prisma.user.count({ where: { registrationStatus: RegistrationStatus.PENDING } }),
      this.prisma.document.count({ where: { status: DocumentStatus.PENDING } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
      this.prisma.roomRequest.count({ where: { status: RequestStatus.PENDING } }),
      this.prisma.maintenanceRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.messageRecipient.count({ where: { isRead: false, recipient: { role: 'ADMIN' } } }),
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

  /** groupBy only returns rows that exist — this fills in 0 for statuses with no rows, so the chart never has a missing category. */
  private fillZeros(
    counts: { status: string; _count: number }[],
    allStatuses: string[],
  ): Record<string, number> {
    const result: Record<string, number> = Object.fromEntries(allStatuses.map((s) => [s, 0]));
    for (const row of counts) {
      result[row.status] = row._count;
    }
    return result;
  }

  async exportPaymentsCsv(): Promise<string> {
    const payments = await this.prisma.payment.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        room: { select: { roomNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = [
      'Payment Number', 'Tenant', 'Email', 'Room', 'Amount', 'Currency',
      'Months Covered', 'Period Start', 'Period End', 'Payment Date', 'Status',
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
}
