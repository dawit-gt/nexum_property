import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() emailEnabled?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() telegramEnabled?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() smsEnabled?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() inAppEnabled?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() pushEnabled?: boolean;
}
