import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(propertyId: string, dto: CreateBuildingDto) {
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

    return this.prisma.building.create({ data: { ...dto, propertyId } });
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

  async update(id: string, dto: UpdateBuildingDto) {
    await this.findOne(id);
    return this.prisma.building.update({ where: { id }, data: dto });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.building.update({ where: { id }, data: { isActive: false } });
  }
}