import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

/** Filters for the CSV exports; they mirror the filters on the matching list. */
export class ExportQueryDto {
  @ApiProperty({
    required: false,
    description: 'A status for that list, or ALL (the default).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiProperty({ required: false, example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ required: false, example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
