import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { UserRole } from '@prisma/client';

import { UsersService } from './users.service';

import { ReviewRegistrationDto } from './dto/review-registration.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: "Get the current user's full profile",
  })
  getMe(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.findById(user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN] List users — paginated, searchable by name/phone/email/room, filterable by registration status',
  })
  findAll(
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[ADMIN] Get a user by id',
  })
  findOne(
    @Param('id') id: string,
  ) {
    return this.usersService.findById(id);
  }

  @Patch(':id/registration')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN] Approve or reject a tenant registration',
  })
  reviewRegistration(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewRegistrationDto,
  ) {
    return this.usersService.reviewRegistration(
      admin.id,
      id,
      dto.status,
      dto.rejectionReason,
    );
  }

  @Patch(':id/suspend')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[ADMIN] Suspend a user account',
  })
  suspend(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
  ) {
    return this.usersService.suspend(
      admin.id,
      id,
      dto.reason,
    );
  }

  @Patch(':id/reactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN] Reactivate a suspended user account',
  })
  reactivate(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.usersService.reactivate(
      admin.id,
      id,
    );
  }
}
