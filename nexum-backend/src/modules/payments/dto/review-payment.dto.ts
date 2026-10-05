import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

const REVIEW_STATUSES = {
  APPROVED: PaymentStatus.APPROVED,
  REJECTED: PaymentStatus.REJECTED,
} as const;

export class ReviewPaymentDto {
  @ApiProperty({ enum: REVIEW_STATUSES })
  @IsEnum(REVIEW_STATUSES)
  status: typeof PaymentStatus.APPROVED | typeof PaymentStatus.REJECTED;

  @ApiProperty({ required: false, description: 'Required when status is REJECTED' })
  @ValidateIf((dto: ReviewPaymentDto) => dto.status === PaymentStatus.REJECTED)
  @IsString()
  @IsNotEmpty({ message: 'rejectionReason is required when rejecting a payment' })
  rejectionReason?: string;
}
