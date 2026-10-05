import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  leaseId: string;

  @ApiProperty({ example: 60000, description: 'Total amount paid, in ETB' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 3, description: 'Number of months this payment covers' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  monthsCovered: number;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ required: false, example: 'Bank transfer' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
