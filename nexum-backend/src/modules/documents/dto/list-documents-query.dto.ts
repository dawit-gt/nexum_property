import { ApiProperty } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';
import { DateRangeQueryDto } from '../../../common/dto/date-range-query.dto';

const STATUS_VALUES = [...Object.values(DocumentStatus), 'ALL'];

export class ListDocumentsQueryDto extends DateRangeQueryDto {
  @ApiProperty({
    required: false,
    enum: STATUS_VALUES,
    description: 'Defaults to PENDING. Use ALL for every status.',
  })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: DocumentStatus | 'ALL';
}
