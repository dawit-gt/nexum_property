import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Bole Tower' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'BT', description: 'Short unique code used in room/building codes' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Bole Road, near Edna Mall' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ required: false, default: 'Addis Ababa' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
