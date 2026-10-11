import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

// floorNumber excluded — it's what @@unique([buildingId, floorNumber]) keys
// off, and every Room on this floor denormalizes floorId, so renumbering
// isn't a plain field edit.
export class UpdateFloorDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
