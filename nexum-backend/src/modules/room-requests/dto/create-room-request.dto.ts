import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRoomRequestDto {
  @ApiProperty()
  @IsUUID()
  roomId: string;

  @ApiProperty({ example: '2026-10-01' })
  @IsDateString()
  desiredStartDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
