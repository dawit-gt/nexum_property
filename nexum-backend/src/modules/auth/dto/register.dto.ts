import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'abebe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+251911223344' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ minLength: 8, example: 'a-strong-password-123' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ example: 'Abebe' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Kebede' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ required: false, example: 'abebe_k' })
  @IsOptional()
  @IsString()
  telegramUsername?: string;

  @ApiProperty({ required: false, example: 'Bole, Addis Ababa' })
  @IsOptional()
  @IsString()
  address?: string;
}
