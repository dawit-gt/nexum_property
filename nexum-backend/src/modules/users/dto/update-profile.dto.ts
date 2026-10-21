import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ required: false, example: 'Abebe' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  firstName?: string;

  @ApiProperty({ required: false, example: 'Kebede' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  lastName?: string;

  @ApiProperty({ required: false, example: '+251911223344' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({
    required: false,
    example: 'Bole, Addis Ababa',
    description: 'Send an empty string to clear it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiProperty({
    required: false,
    example: 'abebe_k',
    description: 'Send an empty string to clear it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  telegramUsername?: string;
}