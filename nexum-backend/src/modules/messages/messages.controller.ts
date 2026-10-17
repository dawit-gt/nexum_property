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

import { MessagesService } from './messages.service';

import { SendMessageDto } from './dto/send-message.dto';
import { AdminSendMessageDto } from './dto/admin-send-message.dto';
import { ListInboxQueryDto } from './dto/list-inbox-query.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Send a message to the admin team',
  })
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendToAdmins(
      user.id,
      dto,
    );
  }

  @Post('broadcast')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN] Send to an individual, a selected list, or a group of tenants',
  })
  broadcast(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: AdminSendMessageDto,
  ) {
    return this.messagesService.sendFromAdmin(
      admin.id,
      dto,
    );
  }

  @Get('inbox')
  @ApiOperation({
    summary:
      'List messages received by the current user — paginated, searchable by subject',
  })
  inbox(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListInboxQueryDto,
  ) {
    return this.messagesService.findInbox(
      user.id,
      query,
    );
  }

  @Get('sent')
  @ApiOperation({
    summary: 'List messages sent by the current user',
  })
  sent(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagesService.findSent(user.id);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get the current unread message count',
  })
  unreadCount(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagesService.unreadCount(user.id);
  }

  @Get(':id/deliveries')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN] Per-recipient, per-channel delivery status for one message',
  })
  deliveries(@Param('id') id: string) {
    return this.messagesService.findDeliveries(id);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark a received message as read',
  })
  markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.messagesService.markAsRead(
      user.id,
      id,
    );
  }
}