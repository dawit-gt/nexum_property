import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaymentStatus } from '@prisma/client';
import { DateRangeQueryDto } from '../../../common/dto/date-range-query.dto';

const SORTABLE_FIELDS = ['createdAt', 'paymentDate', 'amount'] as const;
const STATUS_VALUES = [...Object.values(PaymentStatus), 'ALL'];

export class ListPaymentsQueryDto extends DateRangeQueryDto {
  @ApiProperty({
    required: false,
    enum: STATUS_VALUES,
    description: 'Defaults to PENDING. Use ALL for every status.',
  })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: PaymentStatus | 'ALL';

  @ApiProperty({ required: false, enum: SORTABLE_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: (typeof SORTABLE_FIELDS)[number] = 'createdAt';

  @ApiProperty({ required: false, enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}