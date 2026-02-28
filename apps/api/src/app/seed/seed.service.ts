import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Organization } from '../organizations/organization.entity';
import { RoleEntity } from '../roles/role.entity';
import { User } from '../users/user.entity';
import { Task } from '../tasks/task.entity';
import { Role, TaskStatus, TaskCategory, TaskPriority } from '@org/data';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const userCount = await this.userRepo.count();
    if (userCount > 0) {
      this.logger.log('Database already seeded, skipping.');
      return;
    }
    this.logger.log('Seeding database...');
    await this.seed();
    this.logger.log('Database seeded successfully.');
  }

  private async seed(): Promise<void> {
    // Orgs
    const parentOrg = await this.orgRepo.save({
      name: 'Acme Corp',
      parentOrganizationId: null,
    });
    const childOrg = await this.orgRepo.save({
      name: 'Acme East',
      parentOrganizationId: parentOrg.id,
    });

    // Roles
    const ownerRole = await this.roleRepo.save({
      name: Role.Owner,
      description: 'Full access including child orgs',
    });
    const adminRole = await this.roleRepo.save({
      name: Role.Admin,
      description: 'Full task CRUD within own org, audit log access',
    });
    const viewerRole = await this.roleRepo.save({
      name: Role.Viewer,
      description: 'Read-only access to tasks within own org',
    });

    // Users
    const ownerHash = await bcrypt.hash('Password123!', 12);
    const adminHash = await bcrypt.hash('Password123!', 12);
    const viewerHash = await bcrypt.hash('Password123!', 12);

    const owner = await this.userRepo.save({
      email: 'owner@acme.com',
      password: ownerHash,
      firstName: 'Alice',
      lastName: 'Owner',
      organizationId: parentOrg.id,
      roleId: ownerRole.id,
    });
    const admin = await this.userRepo.save({
      email: 'admin@acme.com',
      password: adminHash,
      firstName: 'Bob',
      lastName: 'Admin',
      organizationId: childOrg.id,
      roleId: adminRole.id,
    });
    const viewer = await this.userRepo.save({
      email: 'viewer@acme.com',
      password: viewerHash,
      firstName: 'Carol',
      lastName: 'Viewer',
      organizationId: childOrg.id,
      roleId: viewerRole.id,
    });

    // Sample tasks
    const tasks = [
      {
        title: 'Set up CI/CD pipeline',
        description: 'Configure GitHub Actions for automated builds',
        status: TaskStatus.Todo,
        category: TaskCategory.Work,
        priority: TaskPriority.High,
        order: 0,
        createdById: owner.id,
        organizationId: parentOrg.id,
      },
      {
        title: 'Review Q1 budget',
        description: 'Prepare budget review for board meeting',
        status: TaskStatus.InProgress,
        category: TaskCategory.Work,
        priority: TaskPriority.High,
        order: 0,
        createdById: owner.id,
        organizationId: parentOrg.id,
      },
      {
        title: 'Annual strategy update',
        status: TaskStatus.Done,
        category: TaskCategory.Work,
        priority: TaskPriority.Medium,
        order: 0,
        createdById: owner.id,
        organizationId: parentOrg.id,
        description: null,
      },
      {
        title: 'Onboard new team members',
        description: 'Prepare onboarding documents for East office',
        status: TaskStatus.Todo,
        category: TaskCategory.Work,
        priority: TaskPriority.Medium,
        order: 0,
        createdById: admin.id,
        organizationId: childOrg.id,
      },
      {
        title: 'Fix login bug in dashboard',
        description: 'Users report intermittent 401 errors on refresh',
        status: TaskStatus.InProgress,
        category: TaskCategory.Work,
        priority: TaskPriority.High,
        order: 0,
        createdById: admin.id,
        organizationId: childOrg.id,
        assignedToId: viewer.id,
      },
      {
        title: 'Document API endpoints',
        description: 'Write OpenAPI docs for all task endpoints',
        status: TaskStatus.Done,
        category: TaskCategory.Work,
        priority: TaskPriority.Low,
        order: 0,
        createdById: admin.id,
        organizationId: childOrg.id,
        description2: null,
      },
    ];

    for (const t of tasks) {
      await this.taskRepo.save({
        title: t.title,
        description: t.description ?? null,
        status: t.status,
        category: t.category,
        priority: t.priority,
        order: t.order,
        createdById: t.createdById,
        organizationId: t.organizationId,
        assignedToId: (t as { assignedToId?: string }).assignedToId ?? null,
      });
    }
  }
}
