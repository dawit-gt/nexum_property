import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { UserRole } from '@prisma/client';

import { PaymentsService } from './payments.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { ReviewPaymentDto } from './dto/review-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';

import { multerOptions } from '../../common/config/multer.config';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

const RECEIPT_UPLOAD_SCHEMA = {
  type: 'object' as const,
  properties: {
    file: {
      type: 'string' as const,
      format: 'binary' as const,
    },
    leaseId: {
      type: 'string' as const,
    },
    amount: {
      type: 'number' as const,
    },
    monthsCovered: {
      type: 'number' as const,
    },
    paymentDate: {
      type: 'string' as const,
    },
    paymentMethod: {
      type: 'string' as const,
    },
    referenceNumber: {
      type: 'string' as const,
    },
    note: {
      type: 'string' as const,
    },
  },
};

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', multerOptions),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: RECEIPT_UPLOAD_SCHEMA,
  })
  @ApiOperation({
    summary:
      'Submit a payment with receipt (covered period is computed automatically)',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.paymentsService.create(
      user.id,
      dto,
      file,
    );
  }

  @Get('mine')
  @ApiOperation({
    summary: "List the current user's payment history",
  })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.findMine(user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN] List payments for review — paginated, searchable by payment number/room/tenant (defaults to PENDING)',
  })
  findForReview(
    @Query() query: ListPaymentsQueryDto,
  ) {
    return this.paymentsService.findForReview(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get one payment with a signed receipt URL (owner or admin only)',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.paymentsService.findOneWithAccessCheck(
      id,
      user,
    );
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      '[ADMIN] Approve or reject a pending payment',
  })
  review(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewPaymentDto,
  ) {
    return this.paymentsService.review(
      id,
      admin.id,
      dto.status,
      dto.rejectionReason,
    );
  }
}
