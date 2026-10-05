import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { RegistrationStatus } from '@prisma/client';

const REVIEW_STATUSES = {
  APPROVED: RegistrationStatus.APPROVED,
  REJECTED: RegistrationStatus.REJECTED,
} as const;

export class ReviewRegistrationDto {
  @ApiProperty({ enum: REVIEW_STATUSES, example: RegistrationStatus.APPROVED })
  @IsEnum(REVIEW_STATUSES)
  status: typeof RegistrationStatus.APPROVED | typeof RegistrationStatus.REJECTED;

  @ApiProperty({
    required: false,
    description: 'Required when status is REJECTED',
    example: 'Submitted documents do not match the applicant name.',
  })
  @ValidateIf((dto: ReviewRegistrationDto) => dto.status === RegistrationStatus.REJECTED)
  @IsString()
  @IsNotEmpty({ message: 'rejectionReason is required when rejecting a registration' })
  rejectionReason?: string;
}
