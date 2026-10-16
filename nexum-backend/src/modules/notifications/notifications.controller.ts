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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { UserRole } from '@prisma/client';

import { NotificationsService } from './notifications.service';

import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';

import { UpdateAdminNotificationPreferenceDto } from './dto/update-admin-notification-preference.dto';

import { TestNotificationDto } from './dto/test-notification.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

import { Roles } from '../../common/decorators/roles.decorator';

import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('preferences')
  @ApiOperation({
    summary:
      "Get the current user's notification channel preferences",
  })
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getOrCreatePreference(
      user.id,
    );
  }

  @Patch('preferences')
  @ApiOperation({
    summary:
      "Update the current user's notification channel preferences",
  })
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updatePreference(
      user.id,
      dto,
    );
  }

  @Get('admin-preferences')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN] Get how this admin wants to be alerted to system events',
  })
  getAdminPreferences(
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.notificationsService.getOrCreateAdminPreference(
      admin.id,
    );
  }

  @Patch('admin-preferences')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[ADMIN] Update admin alert preferences',
  })
  updateAdminPreferences(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateAdminNotificationPreferenceDto,
  ) {
    return this.notificationsService.updateAdminPreference(
      admin.id,
      dto,
    );
  }

  @Get()
  @ApiQuery({
    name: 'unreadOnly',
    required: false,
    type: Boolean,
  })
  @ApiOperation({
    summary: "List the current user's notifications",
  })
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findMine(
      user.id,
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get the current unread notification count',
  })
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.unreadCount(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark one notification as read',
  })
  markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(
      user.id,
      id,
    );
  }

  @Patch('mark-all-read')
  @ApiOperation({
    summary: 'Mark every notification as read',
  })
  markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Post('test')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN, testing only] Manually trigger a notification to verify the pipeline',
  })
  test(@Body() dto: TestNotificationDto) {
    return this.notificationsService.send({ ...dto, connectedChannels: false });
  }

  @Get('deliveries/:deliveryId/sms-handoff')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN] Get the sms: link + QR code for one SMS delivery (marks it OPENED_FOR_SENDING)',
  })
  getSmsHandoff(
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.notificationsService.getSmsHandoff(
      deliveryId,
    );
  }
}