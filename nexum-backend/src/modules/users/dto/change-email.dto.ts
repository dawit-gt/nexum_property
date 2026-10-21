import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ChangeEmailDto {
  @ApiProperty({ example: 'new-address@example.com' })
  @IsEmail()
  newEmail: string;

  @ApiProperty({ description: 'Confirms it is really the account owner.' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;
}