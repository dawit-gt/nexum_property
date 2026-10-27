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

import { PropertiesService } from './properties.service';
import { BuildingsService } from './buildings.service';

import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CreateBuildingDto } from './dto/create-building.dto';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('properties')
@ApiBearerAuth()
@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly buildingsService: BuildingsService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Create a property' })
  create(@CurrentUser() admin: AuthenticatedUser, @Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(dto, admin.id);
  }

  @Get()
  @ApiOperation({ summary: 'List properties' })
  findAll() {
    return this.propertiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one property' })
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Update a property' })
  update(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(id, dto, admin.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Deactivate a property (soft delete)' })
  remove(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    return this.propertiesService.softDelete(id, admin.id);
  }

  @Post(':propertyId/buildings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Add a building to a property' })
  createBuilding(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateBuildingDto,
  ) {
    return this.buildingsService.create(propertyId, dto, admin.id);
  }

  @Get(':propertyId/buildings')
  @ApiOperation({ summary: 'List buildings in a property' })
  listBuildings(@Param('propertyId') propertyId: string) {
    return this.buildingsService.findAllForProperty(propertyId);
  }
}
