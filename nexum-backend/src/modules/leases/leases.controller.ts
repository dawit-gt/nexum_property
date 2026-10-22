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

import { LeasesService } from './leases.service';

import { TerminateLeaseDto } from './dto/terminate-lease.dto';
import { ListLeasesQueryDto } from './dto/list-leases-query.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('leases')
@ApiBearerAuth()
@Controller('leases')
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Get('mine')
  @ApiOperation({ summary: "List the current user's leases" })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.leasesService.findMine(user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN] List leases — paginated, searchable, filterable by status and date range',
  })
  findAll(@Query() query: ListLeasesQueryDto) {
    return this.leasesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one lease (owner or admin only)' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.leasesService.findOne(id, user);
  }

  @Patch(':id/terminate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN] Terminate an active lease (releases the room to AVAILABLE)',
  })
  terminate(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: TerminateLeaseDto,
  ) {
    return this.leasesService.terminate(
      id,
      dto,
      admin.id,
    );
  }

  @Post('expire-ended')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN, testing only] Manually run the lease-expiry check (automated in Phase 8)',
  })
  expireEnded() {
    return this.leasesService.expireEndedLeases();
  }
}
