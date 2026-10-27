import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AuditAction,
  RoomStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';
import { STORAGE_BUCKETS } from '../../common/constants/storage.constants';
import { assertValidUpload } from '../../common/utils/file-validation.util';
import { paginate } from '../../common/utils/paginate.util';

import { AuditService } from '../audit/audit.service';

import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto';

function computeMonthlyRent(
  areaSqM: number,
  pricePerSqM: number,
): number {
  // Plain float math, rounded to 2 decimals — acceptable for MVP.
  // A real accounting-grade system would use Prisma.Decimal arithmetic
  // throughout instead of JS numbers.
  return Math.round(areaSqM * pricePerSqM * 100) / 100;
}

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateRoomDto, adminId: string) {
    const floor = await this.prisma.floor.findUnique({
      where: { id: dto.floorId },
      include: {
        building: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!floor) {
      throw new NotFoundException('Floor not found');
    }

    if (
      !floor.isActive ||
      !floor.building.isActive ||
      !floor.building.property.isActive
    ) {
      throw new BadRequestException(
        'Cannot add a room to an inactive floor, building, or property',
      );
    }

    const existing = await this.prisma.room.findUnique({
      where: {
        floorId_roomNumber: {
          floorId: dto.floorId,
          roomNumber: dto.roomNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Room "${dto.roomNumber}" already exists on this floor`,
      );
    }

    const created = await this.prisma.room.create({
      data: {
        floorId: dto.floorId,
        buildingId: floor.buildingId,
        propertyId: floor.building.propertyId,
        roomNumber: dto.roomNumber,
        areaSqM: dto.areaSqM,
        pricePerSqM: dto.pricePerSqM,
        monthlyRent: computeMonthlyRent(
          dto.areaSqM,
          dto.pricePerSqM,
        ),
        description: dto.description,
        status: RoomStatus.AVAILABLE,
      },
    });

    await this.audit.log({
      actorId: adminId,
      action: AuditAction.CREATE,
      entityType: 'ROOM',
      entityId: created.id,
      newValue: {
        roomNumber: created.roomNumber,
        areaSqM: created.areaSqM,
        pricePerSqM: created.pricePerSqM,
        monthlyRent: created.monthlyRent,
      },
    });

    return created;
  }

  /**
   * Tenants only ever see AVAILABLE rooms, regardless of what filters they
   * pass — admins see everything. This is the one place that rule is
   * enforced, so every caller (controller) stays simple.
   */
  async findAll(
    query: ListRoomsQueryDto,
    requesterRole: string,
  ) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      propertyId,
      buildingId,
      floorId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const isAdmin = requesterRole === 'ADMIN';

    const where = {
      status: isAdmin ? status : RoomStatus.AVAILABLE,
      propertyId,
      buildingId,
      floorId,
      ...(search
        ? {
            OR: [
              {
                roomNumber: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                building: {
                  name: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                floor: {
                  name: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      this.prisma.room.count({
        where,
      }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string, requesterRole: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Hide non-available inventory from tenants entirely — 404, not 403,
    // so a browsing tenant can't tell the difference between "doesn't
    // exist" and "exists but isn't available."
    if (
      requesterRole !== 'ADMIN' &&
      room.status !== RoomStatus.AVAILABLE
    ) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async update(
    id: string,
    dto: UpdateRoomDto,
    adminId: string,
  ) {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (
      dto.roomNumber &&
      dto.roomNumber !== room.roomNumber
    ) {
      const existing = await this.prisma.room.findUnique({
        where: {
          floorId_roomNumber: {
            floorId: room.floorId,
            roomNumber: dto.roomNumber,
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Room "${dto.roomNumber}" already exists on this floor`,
        );
      }
    }

    const newAreaSqM =
      dto.areaSqM ?? Number(room.areaSqM);

    const newPricePerSqM =
      dto.pricePerSqM ?? Number(room.pricePerSqM);

    const rentChanged =
      dto.areaSqM !== undefined ||
      dto.pricePerSqM !== undefined;

    const newMonthlyRent = rentChanged
      ? computeMonthlyRent(
          newAreaSqM,
          newPricePerSqM,
        )
      : undefined;

    const updated = await this.prisma.room.update({
      where: { id },
      data: {
        ...dto,
        monthlyRent: newMonthlyRent,
      },
    });

    if (rentChanged) {
      await this.audit.log({
        actorId: adminId,
        action: AuditAction.PRICE_CHANGE,
        entityType: 'ROOM',
        entityId: id,
        oldValue: {
          areaSqM: room.areaSqM,
          pricePerSqM: room.pricePerSqM,
          monthlyRent: room.monthlyRent,
        },
        newValue: {
          areaSqM: newAreaSqM,
          pricePerSqM: newPricePerSqM,
          monthlyRent: newMonthlyRent,
        },
      });
    }

    // Everything except rent, which is logged above as a price change.
    const otherChanges = Object.fromEntries(
      Object.entries(dto).filter(
        ([key]) => key !== 'areaSqM' && key !== 'pricePerSqM',
      ),
    );

    await this.audit.logChange({
      actorId: adminId,
      entityType: 'ROOM',
      entityId: id,
      before: room,
      after: otherChanges,
    });

    return updated;
  }

  async updateStatus(
    id: string,
    status: RoomStatus,
    adminId: string,
  ) {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.status === RoomStatus.OCCUPIED) {
      throw new BadRequestException(
        'This room is currently OCCUPIED under an active lease — status changes for occupied rooms are handled by the lease workflow, not set directly',
      );
    }

    const updated = await this.prisma.room.update({
      where: { id },
      data: { status },
    });

    await this.audit.log({
      actorId: adminId,
      action: AuditAction.STATUS_CHANGE,
      entityType: 'ROOM',
      entityId: id,
      oldValue: {
        status: room.status,
      },
      newValue: {
        status,
      },
    });

    return updated;
  }

  async softDelete(
    id: string,
    adminId: string,
  ) {
    return this.updateStatus(
      id,
      RoomStatus.INACTIVE,
      adminId,
    );
  }

  async addImage(
    id: string,
    file: Express.Multer.File,
  ) {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    assertValidUpload(file);

    const path = this.storage.buildSecurePath(
      `rooms/${id}`,
      file.originalname,
    );

    await this.storage.upload(
      STORAGE_BUCKETS.ROOM_IMAGES,
      path,
      file.buffer,
      file.mimetype,
    );

    const publicUrl =
      this.storage.getPublicUrl(
        STORAGE_BUCKETS.ROOM_IMAGES,
        path,
      );

    return this.prisma.room.update({
      where: { id },
      data: {
        images: {
          push: publicUrl,
        },
      },
    });
  }

  /**
   * Removes the URL from the room's image list. Deliberately does not try
   * to also delete the underlying storage object — parsing a storage path
   * back out of a public URL is fragile, and an orphaned image file is a
   * harmless, low-cost trade-off for a free-first MVP.
   */
  async removeImage(
    id: string,
    imageUrl: string,
  ) {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return this.prisma.room.update({
      where: { id },
      data: {
        images: {
          set: room.images.filter(
            (url) => url !== imageUrl,
          ),
        },
      },
    });
  }
}
