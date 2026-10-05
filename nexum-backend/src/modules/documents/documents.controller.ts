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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentStatus, UserRole } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ReviewDocumentDto } from './dto/review-document.dto';
import { multerOptions } from '../../common/config/multer.config';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

const FILE_UPLOAD_SCHEMA = {
  type: 'object' as const,
  properties: {
    file: { type: 'string' as const, format: 'binary' as const },
    documentType: { type: 'string' as const },
    title: { type: 'string' as const },
  },
};

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: FILE_UPLOAD_SCHEMA })
  @ApiOperation({ summary: 'Upload a new registration document' })
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.upload(user.id, dto.documentType, dto.title, file);
  }

  @Post(':id/reupload')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: FILE_UPLOAD_SCHEMA })
  @ApiOperation({
    summary: 'Replace a REJECTED document with a corrected version (keeps history)',
  })
  reupload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.reupload(user.id, id, dto.title, file);
  }

  @Get('mine')
  @ApiOperation({ summary: "List the current user's documents (all versions)" })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.listMine(user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiQuery({ name: 'status', enum: DocumentStatus, required: false })
  @ApiOperation({ summary: '[ADMIN] List documents for review (defaults to PENDING)' })
  listForReview(@Query('status') status?: DocumentStatus) {
    return this.documentsService.listForReview(status);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one document with a time-limited signed URL (owner or admin only)',
  })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documentsService.findOneWithAccessCheck(id, user);
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Approve or reject a pending document' })
  review(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    return this.documentsService.review(id, admin.id, dto.status, dto.rejectionReason);
  }
}
