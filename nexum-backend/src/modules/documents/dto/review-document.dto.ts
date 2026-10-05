import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { DocumentStatus } from '@prisma/client';

const REVIEW_STATUSES = {
  APPROVED: DocumentStatus.APPROVED,
  REJECTED: DocumentStatus.REJECTED,
} as const;

export class ReviewDocumentDto {
  @ApiProperty({ enum: REVIEW_STATUSES, example: DocumentStatus.APPROVED })
  @IsEnum(REVIEW_STATUSES)
  status: typeof DocumentStatus.APPROVED | typeof DocumentStatus.REJECTED;

  @ApiProperty({
    required: false,
    description: 'Required when status is REJECTED',
    example: 'Document is blurry, please re-upload a clearer scan.',
  })
  @ValidateIf((dto: ReviewDocumentDto) => dto.status === DocumentStatus.REJECTED)
  @IsString()
  @IsNotEmpty({ message: 'rejectionReason is required when rejecting a document' })
  rejectionReason?: string;
}
