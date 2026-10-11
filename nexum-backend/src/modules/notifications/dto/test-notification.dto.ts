import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { NotificationChannel, NotificationType } from '@prisma/client';

export class TestNotificationDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'Test notification' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'This is a test.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ enum: NotificationType, default: NotificationType.SYSTEM })
  @IsEnum(NotificationType)
  type: NotificationType = NotificationType.SYSTEM;

  @ApiProperty({ enum: NotificationChannel, isArray: true, example: ['IN_APP'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  actionUrl?: string;
}
