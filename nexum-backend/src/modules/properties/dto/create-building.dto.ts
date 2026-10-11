import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBuildingDto {
  @ApiProperty({ example: 'Block A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'A', description: 'Unique within the property' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
