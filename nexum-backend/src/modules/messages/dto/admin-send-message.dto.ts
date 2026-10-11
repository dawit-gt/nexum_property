import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { MessageTargetType } from '@prisma/client';

export class AdminSendMessageDto {
  @ApiProperty({ example: 'Water interruption notice' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ enum: MessageTargetType })
  @IsEnum(MessageTargetType)
  targetType: MessageTargetType;

  @ApiProperty({ required: false, description: 'Required when targetType is INDIVIDUAL' })
  @ValidateIf((dto: AdminSendMessageDto) => dto.targetType === MessageTargetType.INDIVIDUAL)
  @IsUUID()
  recipientId?: string;

  @ApiProperty({ required: false, type: [String], description: 'Required when targetType is SELECTED' })
  @ValidateIf((dto: AdminSendMessageDto) => dto.targetType === MessageTargetType.SELECTED)
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  recipientIds?: string[];

  @ApiProperty({ required: false, description: 'Required when targetType is GROUP_PROPERTY' })
  @ValidateIf((dto: AdminSendMessageDto) => dto.targetType === MessageTargetType.GROUP_PROPERTY)
  @IsUUID()
  propertyId?: string;

  @ApiProperty({ required: false, description: 'Required when targetType is GROUP_BUILDING' })
  @ValidateIf((dto: AdminSendMessageDto) => dto.targetType === MessageTargetType.GROUP_BUILDING)
  @IsUUID()
  buildingId?: string;

  @ApiProperty({ required: false, description: 'Required when targetType is GROUP_FLOOR' })
  @ValidateIf((dto: AdminSendMessageDto) => dto.targetType === MessageTargetType.GROUP_FLOOR)
  @IsUUID()
  floorId?: string;
}
