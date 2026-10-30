import { Injectable, NotFoundException } from '@nestjs/common';
import { RoomStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { paginate } from '../../common/utils/paginate.util';
import { PublicRoomsQueryDto } from './dto/public-rooms-query.dto';

/** The most rooms one public page may return, whatever the caller asks for. */
const MAX_PUBLIC_LIMIT = 24;

// Everything a visitor who is not logged in may see about a room. No tenant,
// lease or internal status information is ever included.
const PUBLIC_ROOM_SELECT = {
  id: true,
  roomNumber: true,
  areaSqM: true,
  pricePerSqM: true,
  monthlyRent: true,
  description: true,
  images: true,
  floor: { select: { floorNumber: true } },
  building: { select: { name: true } },
  property: { select: { name: true, address: true, city: true } },
} as const;

// Only rooms that can really be requested right now, and only while the
// property, building and floor they sit in are still active.
const OPEN_FOR_REQUESTS = {
  status: RoomStatus.AVAILABLE,
  property: { isActive: true },
  building: { isActive: true },
  floor: { isActive: true },
} as const;

@Injectable()
export class PublicRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PublicRoomsQueryDto) {
    const { page = 1, search, maxRent, sort = 'newest' } = query;
    const limit = Math.min(query.limit ?? 12, MAX_PUBLIC_LIMIT);
    const term = search?.trim();

    const where = {
      ...OPEN_FOR_REQUESTS,
      ...(maxRent !== undefined ? { monthlyRent: { lte: maxRent } } : {}),
      ...(term
        ? {
            OR: [
              { roomNumber: { contains: term, mode: 'insensitive' as const } },
              { building: { name: { contains: term, mode: 'insensitive' as const } } },
              { property: { name: { contains: term, mode: 'insensitive' as const } } },
              { property: { address: { contains: term, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const orderBy =
      sort === 'price_asc'
        ? { monthlyRent: 'asc' as const }
        : sort === 'price_desc'
          ? { monthlyRent: 'desc' as const }
          : { createdAt: 'desc' as const };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where,
        select: PUBLIC_ROOM_SELECT,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.room.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, ...OPEN_FOR_REQUESTS },
      select: PUBLIC_ROOM_SELECT,
    });

    // 404 for anything that is not open, so nobody can tell "taken" from "unknown".
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }
}