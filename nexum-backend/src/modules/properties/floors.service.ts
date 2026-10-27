import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@Injectable()
export class FloorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(buildingId: string, dto: CreateFloorDto, adminId: string) {
    const building = await this.prisma.building.findUnique({ where: { id: buildingId } });
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const existing = await this.prisma.floor.findUnique({
      where: { buildingId_floorNumber: { buildingId, floorNumber: dto.floorNumber } },
    });
    if (existing) {
      throw new ConflictException(`Floor ${dto.floorNumber} already exists in this building`);
    }

    const floor = await this.prisma.floor.create({ data: { ...dto, buildingId } });

    await this.audit.log({
      actorId: adminId,
      action: AuditAction.CREATE,
      entityType: 'FLOOR',
      entityId: floor.id,
      newValue: { floorNumber: floor.floorNumber, building: building.name },
    });

    return floor;
  }

  async findAllForBuilding(buildingId: string) {
    return this.prisma.floor.findMany({ where: { buildingId }, orderBy: { floorNumber: 'asc' } });
  }

  async findOne(id: string) {
    const floor = await this.prisma.floor.findUnique({ where: { id } });
    if (!floor) {
      throw new NotFoundException('Floor not found');
    }
    return floor;
  }

  async update(id: string, dto: UpdateFloorDto, adminId: string) {
    const before = await this.findOne(id);
    const updated = await this.prisma.floor.update({ where: { id }, data: dto });

    await this.audit.logChange({
      actorId: adminId,
      entityType: 'FLOOR',
      entityId: id,
      before,
      after: { ...dto },
    });

    return updated;
  }

  async softDelete(id: string, adminId: string) {
    const floor = await this.findOne(id);
    const updated = await this.prisma.floor.update({ where: { id }, data: { isActive: false } });

    await this.audit.log({
      actorId: adminId,
      action: AuditAction.DELETE,
      entityType: 'FLOOR',
      entityId: id,
      oldValue: { floorNumber: floor.floorNumber, isActive: floor.isActive },
      newValue: { isActive: false },
    });

    return updated;
  }
}
