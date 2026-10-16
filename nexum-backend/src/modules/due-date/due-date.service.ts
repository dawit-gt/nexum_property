import { Injectable, Logger } from '@nestjs/common';
import { LeaseStatus, NotificationChannel, NotificationType, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RoomRequestsService } from '../room-requests/room-requests.service';
import { LeasesService } from '../leases/leases.service';
import { computeNextDueDate, LATEST_APPROVED_PAYMENT_INCLUDE } from '../../common/utils/lease-due-date.util';

const LOOKAHEAD_DAYS = 7;

@Injectable()
export class DueDateService {
  private readonly logger = new Logger(DueDateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly roomRequestsService: RoomRequestsService,
    private readonly leasesService: LeasesService,
  ) {}

  /**
   * The single entry point — called by the daily @Cron job (Step 3) and by
   * the manual admin-trigger endpoint (Step 4, useful for testing now and
   * as the dashboard-load safety net once Phase 9 builds the dashboard).
   */
  async runDailyCheck() {
    const paymentAlerts = await this.checkPaymentsDueSoon();
    const reservations = await this.roomRequestsService.expireStaleReservations();
    const leases = await this.leasesService.expireEndedLeases();

    this.logger.log(
      `Daily check: ${paymentAlerts.alertsSent} payment-due alert(s) sent, ` +
        `${reservations.expiredCount} reservation(s) expired, ${leases.expiredCount} lease(s) expired.`,
    );

    return { paymentAlerts, reservations, leases };
  }

  /**
   * Finds ACTIVE leases whose next payment is due within LOOKAHEAD_DAYS and
   * alerts every active admin, de-duplicated per lease+due-date so re-runs
   * (daily job re-firing, or the manual trigger) never double-alert for the
   * same period.
   */
  async checkPaymentsDueSoon() {
    const activeLeases = await this.prisma.lease.findMany({
      where: { status: LeaseStatus.ACTIVE },
      include: { ...LATEST_APPROVED_PAYMENT_INCLUDE, room: { select: { roomNumber: true } } },
    });

    const now = new Date();
    const horizon = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

    const dueSoon = activeLeases.filter((lease) => {
      const nextDue = computeNextDueDate(lease);
      return nextDue >= now && nextDue <= horizon;
    });

    if (dueSoon.length === 0) {
      return { alertsSent: 0, leasesChecked: activeLeases.length };
    }

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      select: { id: true },
    });

    let alertsSent = 0;

    for (const lease of dueSoon) {
      const nextDue = computeNextDueDate(lease);
      // Encodes lease + due-date into the notification's actionUrl and uses
      // that as the de-dup key — no schema change needed for this marker.
      const marker = `/admin/leases/${lease.id}?due=${nextDue.toISOString().slice(0, 10)}`;

      const alreadyAlerted = await this.prisma.notification.findFirst({
        where: { type: NotificationType.PAYMENT_DUE_ALERT, actionUrl: marker },
      });
      if (alreadyAlerted) continue;

      for (const admin of admins) {
        const prefs = await this.notifications.getOrCreateAdminPreference(admin.id);
        const channels: NotificationChannel[] = [];
        if (prefs.paymentsDueInApp) channels.push(NotificationChannel.IN_APP);
        if (prefs.paymentsDueEmail) channels.push(NotificationChannel.EMAIL);
        if (prefs.paymentsDuePush) channels.push(NotificationChannel.PUSH);

        // Deliberately skip send() entirely rather than call it with an
        // empty array — send() guarantees an IN_APP fallback for accidental
        // all-off tenant preferences, but an admin explicitly disabling all
        // three payments-due toggles is a deliberate opt-out of this
        // specific alert type, and should be honored as "nothing", not
        // silently overridden.
        if (channels.length === 0) continue;

        await this.notifications.send({
          userId: admin.id,
          type: NotificationType.PAYMENT_DUE_ALERT,
          title: 'Payment due soon',
          content: `Room ${lease.room.roomNumber}'s lease has a payment due on ${nextDue.toDateString()}.`,
          channels,
          actionUrl: marker,
          connectedChannels: false,
        });
      }
      alertsSent++;
    }

    return { alertsSent, leasesChecked: activeLeases.length };
  }
}