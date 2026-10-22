import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { UserRole } from '@prisma/client';

import { RoomRequestsService } from './room-requests.service';

import { CreateRoomRequestDto } from './dto/create-room-request.dto';
import { ReviewRoomRequestDto } from './dto/review-room-request.dto';
import { ListRoomRequestsQueryDto } from './dto/list-room-requests-query.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('room-requests')
@ApiBearerAuth()
@Controller('room-requests')
export class RoomRequestsController {
  constructor(
    private readonly roomRequestsService: RoomRequestsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Request an available room' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoomRequestDto,
  ) {
    return this.roomRequestsService.create(user.id, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: "List the current user's room requests" })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.roomRequestsService.findMine(user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN] List requests — paginated, searchable, filterable by status and date range (defaults to PENDING)',
  })
  findForReview(@Query() query: ListRoomRequestsQueryDto) {
    return this.roomRequestsService.findForReview(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one room request (owner or admin only)',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.roomRequestsService.findOne(id, user);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel your own pending request' })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.roomRequestsService.cancel(user.id, id);
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN] Approve (creates a Lease) or reject a pending request',
  })
  review(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewRoomRequestDto,
  ) {
    return this.roomRequestsService.review(
      id,
      admin.id,
      dto.status,
      dto.rejectionReason,
      dto.durationMonths,
    );
  }

  @Post('expire-stale')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN, testing only] Manually run the reservation-expiry check (automated in Phase 8)',
  })
  expireStale() {
    return this.roomRequestsService.expireStaleReservations();
  }
}
