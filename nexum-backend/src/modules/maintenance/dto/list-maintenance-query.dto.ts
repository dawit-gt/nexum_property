import { ApiProperty } from '@nestjs/swagger';
import { MaintenanceStatus } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';
import { DateRangeQueryDto } from '../../../common/dto/date-range-query.dto';

const STATUS_VALUES = [...Object.values(MaintenanceStatus), 'ALL'];

export class ListMaintenanceQueryDto extends DateRangeQueryDto {
  @ApiProperty({
    required: false,
    enum: STATUS_VALUES,
    description: 'Omit or use ALL for every status.',
  })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: MaintenanceStatus | 'ALL';
}
