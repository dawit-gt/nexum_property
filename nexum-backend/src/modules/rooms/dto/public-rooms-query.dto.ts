import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const SORTS = ['newest', 'price_asc', 'price_desc'] as const;

export class PublicRoomsQueryDto extends PaginationQueryDto {
  @ApiProperty({
    required: false,
    description: 'Only rooms up to this monthly rent (ETB)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100_000_000)
  maxRent?: number;

  @ApiProperty({ required: false, enum: SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(SORTS)
  sort?: (typeof SORTS)[number];
}
