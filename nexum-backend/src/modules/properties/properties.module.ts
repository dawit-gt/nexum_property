import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { FloorsController } from './floors.controller';
import { FloorsService } from './floors.service';

@Module({
  controllers: [PropertiesController, BuildingsController, FloorsController],
  providers: [PropertiesService, BuildingsService, FloorsService],
  exports: [PropertiesService, BuildingsService, FloorsService],
})
export class PropertiesModule {}
