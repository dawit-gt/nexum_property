import { ApiProperty } from '@nestjs/swagger';
import { LeaseStatus } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';
import { DateRangeQueryDto } from '../../../common/dto/date-range-query.dto';

const STATUS_VALUES = [...Object.values(LeaseStatus), 'ALL'];

export class ListLeasesQueryDto extends DateRangeQueryDto {
  @ApiProperty({
    required: false,
    enum: STATUS_VALUES,
    description: 'Omit or use ALL for every status.',
  })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: LeaseStatus | 'ALL';
}
