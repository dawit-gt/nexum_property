import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadDocumentDto {
  @ApiProperty({ enum: DocumentType, example: DocumentType.BUSINESS_LICENSE })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ example: 'Business License 2026' })
  @IsString()
  @IsNotEmpty()
  title: string;
}
