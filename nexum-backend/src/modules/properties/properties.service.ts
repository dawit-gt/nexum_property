import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreatePropertyDto, adminId: string) {
    const existing = await this.prisma.property.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`A property with code "${dto.code}" already exists`);
    }

    const property = await this.prisma.property.create({ data: dto });

    await this.audit.log({
      actorId: adminId,
      action: AuditAction.CREATE,
      entityType: 'PROPERTY',
      entityId: property.id,
      newValue: { code: property.code, name: property.name },
    });

    return property;
  }

  async findAll() {
    return this.prisma.property.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  async update(id: string, dto: UpdatePropertyDto, adminId: string) {
    const before = await this.findOne(id);
    const updated = await this.prisma.property.update({ where: { id }, data: dto });

    await this.audit.logChange({
      actorId: adminId,
      entityType: 'PROPERTY',
      entityId: id,
      before,
      after: { ...dto },
    });

    return updated;
  }

  /**
   * Soft delete only — Room/Building rows use onDelete: Restrict against
   * Property, so a hard delete would fail anyway once inventory exists.
   */
  async softDelete(id: string, adminId: string) {
    const property = await this.findOne(id);
    const updated = await this.prisma.property.update({ where: { id }, data: { isActive: false } });

    await this.audit.log({
      actorId: adminId,
      action: AuditAction.DELETE,
      entityType: 'PROPERTY',
      entityId: id,
      oldValue: { code: property.code, name: property.name, isActive: property.isActive },
      newValue: { isActive: false },
    });

    return updated;
  }
}
