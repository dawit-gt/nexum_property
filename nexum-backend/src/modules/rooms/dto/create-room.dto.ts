import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ description: 'The floor this room belongs to — building and property are derived from it' })
  @IsUUID()
  floorId: string;

  @ApiProperty({ example: '101' })
  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @ApiProperty({ example: 25.5, description: 'Area in square meters' })
  @IsNumber()
  @IsPositive()
  areaSqM: number;

  @ApiProperty({ example: 800, description: 'Price per square meter, in ETB' })
  @IsNumber()
  @IsPositive()
  pricePerSqM: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
