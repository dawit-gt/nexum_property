import { Injectable, Logger } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { buildDateRange } from '../../common/utils/date-range.util';
import { diffFields } from './audit-diff.util';

export interface AuditLogParams {
  actorId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit logging must never break the action it's logging — if writing the
 * log entry itself fails, we log the failure and move on rather than
 * throwing, since a missing audit row is far less harmful than an admin
 * unable to approve a payment because of a logging bug.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          oldValue: params.oldValue ? JSON.parse(JSON.stringify(params.oldValue)) : undefined,
          newValue: params.newValue ? JSON.parse(JSON.stringify(params.newValue)) : undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to write audit log for ${params.action} on ${params.entityType}/${params.entityId}: ${message}`);
    }
  }

  /**
   * Records an UPDATE only when something actually changed, storing just the
   * fields that changed (old and new side by side).
   */
  async logChange(params: {
    actorId?: string;
    entityType: string;
    entityId: string;
    before: object;
    after: object;
  }): Promise<void> {
    const changes = diffFields(params.before, params.after);

    if (!changes) return;

    await this.log({
      actorId: params.actorId,
      action: AuditAction.UPDATE,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: changes.oldValue,
      newValue: changes.newValue,
    });
  }

  async findAll(query: ListAuditLogsQueryDto) {
    const { page = 1, limit = 50, entityType, entityId, action, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;
    const timestamp = buildDateRange(dateFrom, dateTo);
    const where = {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(action ? { action } : {}),
      ...(timestamp ? { timestamp } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }
}
