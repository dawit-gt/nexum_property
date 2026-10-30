import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PublicRoomsQueryDto } from './dto/public-rooms-query.dto';
import { PublicRoomsService } from './public-rooms.service';

/**
 * The shop window: rooms that are open for requests, visible without logging
 * in. Strictly read-only and limited to the fields in PUBLIC_ROOM_SELECT.
 */
@ApiTags('public')
@Controller('public/rooms')
export class PublicRoomsController {
  constructor(private readonly publicRooms: PublicRoomsService) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get()
  @ApiOperation({
    summary:
      '[PUBLIC] Browse rooms that are open for requests — searchable, sortable, filterable by rent',
  })
  list(@Query() query: PublicRoomsQueryDto) {
    return this.publicRooms.list(query);
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':id')
  @ApiOperation({ summary: '[PUBLIC] One room that is open for requests' })
  findOne(@Param('id') id: string) {
    return this.publicRooms.findOne(id);
  }
}