import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMaintenanceRequestDto {
  @ApiProperty({ description: 'The room this issue relates to' })
  @IsUUID()
  roomId: string;

  @ApiProperty({ example: 'Leaking faucet' })
  @IsString()
  @IsNotEmpty()
  issueTitle: string;

  @ApiProperty({ example: 'The bathroom faucet has been dripping constantly for two days.' })
  @IsString()
  @IsNotEmpty()
  description: string;
}
