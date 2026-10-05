import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateFloorDto {
  @ApiProperty({ example: 1, description: 'Unique within the building. Use 0 for ground floor, negatives for basements.' })
  @IsInt()
  @Min(-5)
  floorNumber: number;

  @ApiProperty({ example: 'First Floor' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
