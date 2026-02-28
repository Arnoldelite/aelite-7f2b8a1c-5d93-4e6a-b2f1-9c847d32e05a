import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TasksService } from './tasks.service';
import { Task } from './task.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { Role, TaskStatus, TaskCategory, TaskPriority } from '@org/data';

const PARENT_ORG_ID = 'parent-org-id';
const CHILD_ORG_ID = 'child-org-id';

const ownerUser = {
  sub: 'owner-id',
  email: 'owner@acme.com',
  role: Role.Owner,
  orgId: PARENT_ORG_ID,
  parentOrgId: null,
};

const adminUser = {
  sub: 'admin-id',
  email: 'admin@acme.com',
  role: Role.Admin,
  orgId: CHILD_ORG_ID,
  parentOrgId: PARENT_ORG_ID,
};

const viewerUser = {
  sub: 'viewer-id',
  email: 'viewer@acme.com',
  role: Role.Viewer,
  orgId: CHILD_ORG_ID,
  parentOrgId: PARENT_ORG_ID,
};

const makeTask = (overrides: Partial<Task> = {}): Task =>
  ({
    id: 'task-1',
    title: 'Test Task',
    description: 'A description',
    status: TaskStatus.Todo,
    category: TaskCategory.Work,
    priority: TaskPriority.Medium,
    order: 0,
    createdById: 'owner-id',
    organizationId: PARENT_ORG_ID,
    assignedToId: null,
    createdBy: { id: 'owner-id', firstName: 'Jane', lastName: 'Doe' },
    organization: { id: PARENT_ORG_ID, name: 'Acme Corp' },
    assignedTo: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as unknown as Task);

describe('TasksService', () => {
  let service: TasksService;
  let taskRepo: jest.Mocked<Repository<Task>>;
  let orgService: jest.Mocked<OrganizationsService>;

  beforeEach(async () => {
    const mockQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ max: null }),
    } as unknown as SelectQueryBuilder<Task>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
          },
        },
        {
          provide: OrganizationsService,
          useValue: {
            getOrgIdScope: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepo = module.get(getRepositoryToken(Task));
    orgService = module.get(OrganizationsService);
  });

  describe('findAll — RBAC org scoping', () => {
    it('Owner of parent org sees tasks from own org AND child org', async () => {
      orgService.getOrgIdScope.mockResolvedValue([PARENT_ORG_ID, CHILD_ORG_ID]);
      const tasks = [makeTask({ organizationId: PARENT_ORG_ID }), makeTask({ id: 'task-2', organizationId: CHILD_ORG_ID, organization: { id: CHILD_ORG_ID, name: 'Acme East' } as any })];
      taskRepo.find.mockResolvedValue(tasks);

      const result = await service.findAll(ownerUser);

      expect(orgService.getOrgIdScope).toHaveBeenCalledWith(ownerUser);
      expect(result).toHaveLength(2);
    });

    it('Admin sees only tasks from own org', async () => {
      orgService.getOrgIdScope.mockResolvedValue([CHILD_ORG_ID]);
      const tasks = [makeTask({ id: 'task-2', organizationId: CHILD_ORG_ID, organization: { id: CHILD_ORG_ID, name: 'Acme East' } as any })];
      taskRepo.find.mockResolvedValue(tasks);

      const result = await service.findAll(adminUser);

      expect(orgService.getOrgIdScope).toHaveBeenCalledWith(adminUser);
      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe(CHILD_ORG_ID);
    });

    it('Viewer sees only tasks from own org', async () => {
      orgService.getOrgIdScope.mockResolvedValue([CHILD_ORG_ID]);
      taskRepo.find.mockResolvedValue([]);

      const result = await service.findAll(viewerUser);

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('returns task when in scope', async () => {
      orgService.getOrgIdScope.mockResolvedValue([PARENT_ORG_ID]);
      taskRepo.findOne.mockResolvedValue(makeTask());

      const result = await service.findOne('task-1', ownerUser);

      expect(result.id).toBe('task-1');
    });

    it('throws NotFoundException for non-existent task', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', ownerUser)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when task is outside user scope', async () => {
      orgService.getOrgIdScope.mockResolvedValue([CHILD_ORG_ID]);
      taskRepo.findOne.mockResolvedValue(makeTask({ organizationId: PARENT_ORG_ID }));

      await expect(service.findOne('task-1', adminUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('creates a task and returns it as ITask dto', async () => {
      const task = makeTask();
      taskRepo.create.mockReturnValue(task);
      taskRepo.save.mockResolvedValue(task);
      taskRepo.findOne.mockResolvedValue(task);

      const result = await service.create(
        { title: 'Test Task', status: TaskStatus.Todo, category: TaskCategory.Work, priority: TaskPriority.Medium },
        ownerUser
      );

      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Task',
          createdById: ownerUser.sub,
          organizationId: ownerUser.orgId,
        })
      );
      expect(result.title).toBe('Test Task');
    });
  });

  describe('remove', () => {
    it('removes task when user has access', async () => {
      orgService.getOrgIdScope.mockResolvedValue([PARENT_ORG_ID]);
      taskRepo.findOne.mockResolvedValue(makeTask());
      taskRepo.remove.mockResolvedValue(makeTask());

      await service.remove('task-1', ownerUser);

      expect(taskRepo.remove).toHaveBeenCalled();
    });

    it('throws ForbiddenException when task is outside user scope', async () => {
      orgService.getOrgIdScope.mockResolvedValue([CHILD_ORG_ID]);
      taskRepo.findOne.mockResolvedValue(makeTask({ organizationId: PARENT_ORG_ID }));

      await expect(service.remove('task-1', adminUser)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for non-existent task', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('missing', ownerUser)).rejects.toThrow(NotFoundException);
    });
  });
});
