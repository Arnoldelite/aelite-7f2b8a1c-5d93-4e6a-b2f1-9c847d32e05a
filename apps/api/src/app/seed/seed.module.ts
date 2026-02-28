import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Organization } from '../organizations/organization.entity';
import { RoleEntity } from '../roles/role.entity';
import { User } from '../users/user.entity';
import { Task } from '../tasks/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, RoleEntity, User, Task])],
  providers: [SeedService],
})
export class SeedModule {}
