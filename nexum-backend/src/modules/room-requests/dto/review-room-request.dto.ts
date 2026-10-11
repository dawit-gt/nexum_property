import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';
import { RequestStatus } from '@prisma/client';

const REVIEW_STATUSES = {
  APPROVED: RequestStatus.APPROVED,
  REJECTED: RequestStatus.REJECTED,
} as const;

export class ReviewRoomRequestDto {
  @ApiProperty({ enum: REVIEW_STATUSES })
  @IsEnum(REVIEW_STATUSES)
  status: typeof RequestStatus.APPROVED | typeof RequestStatus.REJECTED;

  @ApiProperty({
    required: false,
    description: 'Required when status is REJECTED',
  })
  @ValidateIf((dto: ReviewRoomRequestDto) => dto.status === RequestStatus.REJECTED)
  @IsString()
  @IsNotEmpty({ message: 'rejectionReason is required when rejecting a room request' })
  rejectionReason?: string;

  @ApiProperty({
    required: false,
    default: 12,
    description: 'Lease length in months, only used when status is APPROVED',
  })
  @ValidateIf((dto: ReviewRoomRequestDto) => dto.status === RequestStatus.APPROVED)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  durationMonths?: number = 12;
}