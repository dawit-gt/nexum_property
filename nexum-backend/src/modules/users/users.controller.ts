import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';

import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { UserRole } from '@prisma/client';

import { UsersService } from './users.service';

import { ReviewRegistrationDto } from './dto/review-registration.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangeEmailDto } from './dto/change-email.dto';

import { multerOptions } from '../../common/config/multer.config';

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

  @Patch('me')
  @ApiOperation({
    summary:
      'Edit your own name, phone, address and Telegram username',
  })
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('me/email')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Change your login email (requires your current password)',
  })
  changeMyEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangeEmailDto,
  ) {
    return this.usersService.changeEmail(user.id, dto);
  }

  @Get('me/avatar')
  @ApiOperation({
    summary: 'Get a short-lived signed URL for your profile photo',
  })
  getMyAvatar(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getAvatarUrl(user.id);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload or replace your profile photo (JPG or PNG, max 5MB)',
  })
  uploadMyAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(user.id, file);
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Remove your profile photo' })
  removeMyAvatar(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.removeAvatar(user.id);
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