import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PushService } from './push.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('push')
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Public()
  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get the VAPID public key needed to create a browser subscription' })
  getPublicKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Post('subscribe')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a Web Push subscription for the current device' })
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubscribePushDto) {
    return this.pushService.subscribe(user.id, dto);
  }

  @Delete('unsubscribe')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a Web Push subscription' })
  unsubscribe(@Body('endpoint') endpoint: string) {
    return this.pushService.unsubscribe(endpoint);
  }
}
