import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SuspendUserDto {
  @ApiProperty({ example: 'Repeated late payments without communication' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
