import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import {
  Throttle,
} from '@nestjs/throttler';

import { AuthService } from './auth.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { Public } from '../../common/decorators/public.decorator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // ----------------------------------------------------
  // REGISTER
  // ----------------------------------------------------

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user account',
  })
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ----------------------------------------------------
  // LOGIN
  // ----------------------------------------------------

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email and password',
  })
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ----------------------------------------------------
  // REFRESH TOKEN
  // ----------------------------------------------------

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate a refresh token',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(
      dto.refreshToken,
    );
  }

  // ----------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke a refresh token',
  })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(
      dto.refreshToken,
    );
  }

  // ----------------------------------------------------
  // CHANGE PASSWORD
  // ----------------------------------------------------

  @Patch('change-password')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Change your own password (logs out all other sessions)',
  })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  // ----------------------------------------------------
  // FORGOT PASSWORD
  // ----------------------------------------------------

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Request a password reset email (always returns 204, regardless of whether the email exists)',
  })
  @Throttle({
    default: {
      limit: 3,
      ttl: 60_000,
    },
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ) {
    await this.authService.forgotPassword(
      dto.email,
    );
  }

  // ----------------------------------------------------
  // RESET PASSWORD
  // ----------------------------------------------------

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Reset password using a token from the forgot-password email',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ) {
    await this.authService.resetPassword(
      dto.token,
      dto.newPassword,
    );
  }

  // ----------------------------------------------------
  // CURRENT USER
  // ----------------------------------------------------

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the currently authenticated user',
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }
}
