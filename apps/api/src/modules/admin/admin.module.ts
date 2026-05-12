import { Module } from '@nestjs/common';
import { ErrorSubmissionsModule } from '../error-submissions/index.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [ErrorSubmissionsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
