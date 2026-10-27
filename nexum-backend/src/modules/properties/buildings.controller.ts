import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { UserRole } from '@prisma/client';

import { BuildingsService } from './buildings.service';
import { FloorsService } from './floors.service';

import { UpdateBuildingDto } from './dto/update-building.dto';
import { CreateFloorDto } from './dto/create-floor.dto';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('buildings')
@ApiBearerAuth()
@Controller('buildings')
export class BuildingsController {
  constructor(
    private readonly buildingsService: BuildingsService,
    private readonly floorsService: FloorsService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get one building' })
  findOne(@Param('id') id: string) {
    return this.buildingsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Update a building' })
  update(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBuildingDto,
  ) {
    return this.buildingsService.update(id, dto, admin.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Deactivate a building (soft delete)' })
  remove(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    return this.buildingsService.softDelete(id, admin.id);
  }

  @Post(':buildingId/floors')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Add a floor to a building' })
  createFloor(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateFloorDto,
  ) {
    return this.floorsService.create(buildingId, dto, admin.id);
  }

  @Get(':buildingId/floors')
  @ApiOperation({ summary: 'List floors in a building' })
  listFloors(@Param('buildingId') buildingId: string) {
    return this.floorsService.findAllForBuilding(buildingId);
  }
}
