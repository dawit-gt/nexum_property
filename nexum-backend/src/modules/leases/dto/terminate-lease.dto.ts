import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TerminateLeaseDto {
  @ApiProperty({ example: 'Tenant requested early termination' })
  @IsString()
  @IsNotEmpty()
  terminationReason: string;

  @ApiProperty({ required: false, description: 'Defaults to now if omitted' })
  @IsOptional()
  @IsDateString()
  terminationDate?: string;
}
