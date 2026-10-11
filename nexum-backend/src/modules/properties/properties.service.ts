import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePropertyDto) {
    const existing = await this.prisma.property.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`A property with code "${dto.code}" already exists`);
    }
    return this.prisma.property.create({ data: dto });
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

  async update(id: string, dto: UpdatePropertyDto) {
    await this.findOne(id);
    return this.prisma.property.update({ where: { id }, data: dto });
  }

  /**
   * Soft delete only — Room/Building rows use onDelete: Restrict against
   * Property, so a hard delete would fail anyway once inventory exists.
   */
  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.property.update({ where: { id }, data: { isActive: false } });
  }
}
