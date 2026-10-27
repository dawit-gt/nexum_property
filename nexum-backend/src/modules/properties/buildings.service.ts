import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Injectable()
export class BuildingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(propertyId: string, dto: CreateBuildingDto, adminId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const existing = await this.prisma.building.findUnique({
      where: { propertyId_code: { propertyId, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException(`A building with code "${dto.code}" already exists in this property`);
    }

    const building = await this.prisma.building.create({ data: { ...dto, propertyId } });

    await this.audit.log({
      actorId: adminId,
      action: AuditAction.CREATE,
      entityType: 'BUILDING',
      entityId: building.id,
      newValue: { code: building.code, name: building.name, property: property.name },
    });

    return building;
  }

  async findAllForProperty(propertyId: string) {
    return this.prisma.building.findMany({ where: { propertyId }, orderBy: { code: 'asc' } });
  }

  async findOne(id: string) {
    const building = await this.prisma.building.findUnique({ where: { id } });
    if (!building) {
      throw new NotFoundException('Building not found');
    }
    return building;
  }

  async update(id: string, dto: UpdateBuildingDto, adminId: string) {
    const before = await this.findOne(id);
    const updated = await this.prisma.building.update({ where: { id }, data: dto });

    await this.audit.logChange({
      actorId: adminId,
      entityType: 'BUILDING',
      entityId: id,
      before,
      after: { ...dto },
    });

    return updated;
  }

  async softDelete(id: string, adminId: string) {
    const building = await this.findOne(id);
    const updated = await this.prisma.building.update({ where: { id }, data: { isActive: false } });

    await this.audit.log({
      actorId: adminId,
      action: AuditAction.DELETE,
      entityType: 'BUILDING',
      entityId: id,
      oldValue: { code: building.code, name: building.name, isActive: building.isActive },
      newValue: { isActive: false },
    });

    return updated;
  }
}
