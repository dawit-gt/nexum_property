import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAdminNotificationPreferenceDto {
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() paymentsDueInApp?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() paymentsDueEmail?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() paymentsDuePush?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() maintenanceInApp?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() maintenanceEmail?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() registrationInApp?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() registrationEmail?: boolean;
}
