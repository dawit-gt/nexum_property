import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  RegistrationStatus,
  UserStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';

import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../common/services/email.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { JwtPayload } from './interfaces/jwt-payload.interface';
import {
  generateOpaqueToken,
  hashToken,
} from './utils/token.util';
import { parseDurationToMs } from './utils/duration.util';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SafeUser {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  telegramUsername: string | null;
  role: string;
  status: string;
  registrationStatus: string;
  rejectionReason: string | null;
  avatarUrl: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async getMe(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toSafeUser(user);
  }

  async register(dto: RegisterDto): Promise<SafeUser> {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException(
        'A user with this email already exists',
      );
    }

    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existingPhone) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        telegramUsername: dto.telegramUsername ?? null,
        address: dto.address ?? null,
        role: 'USER',
        status: UserStatus.ACTIVE,
        registrationStatus: RegistrationStatus.PENDING,
        notificationPreference: {
          create: {},
        },
      },
    });

    return this.toSafeUser(user);
  }

  async login(dto: LoginDto): Promise<AuthTokens & { user: SafeUser }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const passwordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        `Your account is ${user.status.toLowerCase()}`,
      );
    }

    const tokens = await this.issueTokens(
      user.id,
      user.email,
    );

    return {
      ...tokens,
      user: this.toSafeUser(user),
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const currentPasswordValid = await argon2.verify(
      user.passwordHash,
      currentPassword,
    );

    if (!currentPasswordValid) {
      throw new UnauthorizedException(
        'Current password is incorrect',
      );
    }

    const newHash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return;
    }

    const rawToken = generateOpaqueToken();

    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash: hashToken(rawToken),
        userId: user.id,
        expiresAt: new Date(
          Date.now() + 30 * 60 * 1000,
        ),
      },
    });

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL');

    if (!frontendUrl) {
      return;
    }

    const resetLink =
      `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await this.emailService.send({
      to: user.email,
      subject: 'Reset your Nexum password',
      html: `
        <p>Hi ${user.firstName},</p>

        <p>
          We received a request to reset your Nexum password.
        </p>

        <p>
          Click the link below to choose a new password:
        </p>

        <p>
          <a href="${resetLink}">
            Reset your password
          </a>
        </p>

        <p>
          This link expires in 30 minutes.
        </p>

        <p>
          If you did not request a password reset,
          you can safely ignore this email.
        </p>

        <p>
          Nexum
        </p>
      `,
    });
  }

  async resetPassword(
    rawToken: string,
    newPassword: string,
  ): Promise<void> {
    const tokenHash = hashToken(rawToken);

    const stored =
      await this.prisma.passwordResetToken.findUnique({
        where: { tokenHash },
      });

    if (
      !stored ||
      stored.usedAt ||
      stored.expiresAt < new Date()
    ) {
      throw new UnauthorizedException(
        'Invalid or expired reset token',
      );
    }

    const newHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash: newHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          userId: stored.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);
  }

  async refresh(
    rawRefreshToken: string,
  ): Promise<AuthTokens> {
    const tokenHash = hashToken(rawRefreshToken);

    const stored =
      await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

    if (!stored) {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    if (stored.revokedAt) {
      throw new UnauthorizedException(
        'Refresh token has been revoked',
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Refresh token has expired',
      );
    }

    if (stored.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'User account is not active',
      );
    }

    const newTokens = await this.issueTokens(
      stored.user.id,
      stored.user.email,
    );

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenHash: hashToken(
          newTokens.refreshToken,
        ),
      },
    });

    return newTokens;
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private async issueTokens(
    userId: string,
    email: string,
  ): Promise<AuthTokens> {
    const accessSecret =
      this.config.get<string>('JWT_ACCESS_SECRET');

    if (!accessSecret) {
      throw new Error(
        'JWT_ACCESS_SECRET is not configured',
      );
    }

    const accessExpiry =
      this.config.get<string>('JWT_ACCESS_EXPIRY') ?? '15m';
    const refreshExpiry =
      this.config.get<string>('JWT_REFRESH_EXPIRY') ?? '30d';

    const accessToken = await this.jwt.signAsync(
      {
        sub: userId,
        email,
      } satisfies JwtPayload,
      {
        secret: accessSecret,
        expiresIn: accessExpiry as never,
      },
    );

    const rawRefreshToken = generateOpaqueToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const refreshExpiresAt = new Date(
      Date.now() + parseDurationToMs(refreshExpiry),
    );

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        userId,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: parseDurationToMs(accessExpiry),
    };
  }

  private toSafeUser(user: {
    id: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    telegramUsername: string | null;
    role: string;
    status: string;
    registrationStatus: string;
    rejectionReason: string | null;
    avatarUrl: string | null;
    address: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SafeUser {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      telegramUsername: user.telegramUsername,
      role: user.role,
      status: user.status,
      registrationStatus: user.registrationStatus,
      rejectionReason: user.rejectionReason,
      avatarUrl: user.avatarUrl,
      address: user.address,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
