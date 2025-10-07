import { Module } from '@nestjs/common';
import { OrtomatsService } from './ortomats.service';
import { OrtomatsController } from './ortomats.controller';

@Module({
  controllers: [OrtomatsController],
  providers: [OrtomatsService],
  exports: [OrtomatsService],
})
export class OrtomatsModule {}