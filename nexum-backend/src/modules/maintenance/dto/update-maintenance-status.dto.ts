import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { MaintenanceStatus } from '@prisma/client';

export class UpdateMaintenanceStatusDto {
  @ApiProperty({ enum: MaintenanceStatus })
  @IsEnum(MaintenanceStatus)
  status: MaintenanceStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiProperty({
    required: false,
    default: false,
    description: 'When moving to IN_PROGRESS, optionally also flip the room to MAINTENANCE status (admin decides — not automatic)',
  })
  @ValidateIf((dto: UpdateMaintenanceStatusDto) => dto.status === MaintenanceStatus.IN_PROGRESS)
  @IsOptional()
  @IsBoolean()
  takeRoomOutOfService?: boolean = false;
}
