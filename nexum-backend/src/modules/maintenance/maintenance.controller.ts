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
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { ListMaintenanceQueryDto } from './dto/list-maintenance-query.dto';
import { multerOptions } from '../../common/config/multer.config';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        roomId: { type: 'string' },
        issueTitle: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Submit a maintenance request (photo optional)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMaintenanceRequestDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.maintenanceService.create(user.id, dto, file);
  }

  @Get('mine')
  @ApiOperation({ summary: "List the current user's maintenance requests" })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.maintenanceService.findMine(user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] List maintenance requests — paginated, searchable, filterable by status and date range' })
  findForReview(@Query() query: ListMaintenanceQueryDto) {
    return this.maintenanceService.findForReview(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one maintenance request with a signed image URL if present (owner or admin only)' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.maintenanceService.findOneWithAccessCheck(id, user);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Update maintenance status' })
  updateStatus(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceStatusDto,
  ) {
    return this.maintenanceService.updateStatus(
      id,
      dto.status,
      dto.adminNotes,
      dto.takeRoomOutOfService,
      admin.id,
    );
  }
}
