import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class DateRangeQueryDto extends PaginationQueryDto {
  @ApiProperty({
    required: false,
    example: '2026-03-01',
    description: 'Start date (inclusive), read as an Addis Ababa calendar day.',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    required: false,
    example: '2026-03-31',
    description: 'End date (inclusive), read as an Addis Ababa calendar day.',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
