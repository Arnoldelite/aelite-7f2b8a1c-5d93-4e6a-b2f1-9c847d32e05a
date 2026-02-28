import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RolesModule } from './roles/roles.module';
import { TasksModule } from './tasks/tasks.module';
import { AuditModule } from './audit/audit.module';
import { SeedModule } from './seed/seed.module';
import { Organization } from './organizations/organization.entity';
import { RoleEntity } from './roles/role.entity';
import { User } from './users/user.entity';
import { Task } from './tasks/task.entity';
import { AuditLog } from './audit/audit-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env['DB_PATH'] ?? 'task_manager.sqlite',
      entities: [Organization, RoleEntity, User, Task, AuditLog],
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    RolesModule,
    TasksModule,
    AuditModule,
    SeedModule,
  ],
})
export class AppModule {}
