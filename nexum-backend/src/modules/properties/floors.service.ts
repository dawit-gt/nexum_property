import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@Injectable()
export class FloorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(buildingId: string, dto: CreateFloorDto) {
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

    return this.prisma.floor.create({ data: { ...dto, buildingId } });
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

  async update(id: string, dto: UpdateFloorDto) {
    await this.findOne(id);
    return this.prisma.floor.update({ where: { id }, data: dto });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.floor.update({ where: { id }, data: { isActive: false } });
  }
}
