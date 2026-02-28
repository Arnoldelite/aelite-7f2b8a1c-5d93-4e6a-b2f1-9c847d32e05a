import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard, RolesGuard } from '@org/auth';
import { Role, TaskStatus, TaskCategory, TaskPriority, AuditAction } from '@org/data';
import { HttpStatus } from '@nestjs/common';

const ownerUser = {
  sub: 'owner-id',
  email: 'owner@acme.com',
  role: Role.Owner,
  orgId: 'org-1',
  parentOrgId: null,
};

const viewerUser = {
  sub: 'viewer-id',
  email: 'viewer@acme.com',
  role: Role.Viewer,
  orgId: 'org-2',
  parentOrgId: 'org-1',
};

const mockTask = {
  id: 'task-1',
  title: 'Test Task',
  status: TaskStatus.Todo,
  category: TaskCategory.Work,
  priority: TaskPriority.Medium,
  order: 0,
  createdById: 'owner-id',
  createdByName: 'Jane Doe',
  organizationId: 'org-1',
  organizationName: 'Acme Corp',
  assignedToId: null,
  assignedToName: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: jest.Mocked<TasksService>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get(TasksService);
    auditService = module.get(AuditService);
  });

  describe('GET /tasks', () => {
    it('returns 200 with list of tasks and logs audit event', async () => {
      tasksService.findAll.mockResolvedValue([mockTask]);
      const req = { ip: '127.0.0.1' };

      const result = await controller.findAll(ownerUser, req as any);

      expect(result).toEqual([mockTask]);
      expect(tasksService.findAll).toHaveBeenCalledWith(ownerUser);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: ownerUser.sub,
          action: AuditAction.ViewTasks,
        })
      );
    });
  });

  describe('POST /tasks', () => {
    it('creates a task and logs audit event', async () => {
      tasksService.create.mockResolvedValue(mockTask);
      const dto = { title: 'New Task' };
      const req = { ip: '127.0.0.1' };

      const result = await controller.create(dto as any, ownerUser, req as any);

      expect(result).toEqual(mockTask);
      expect(tasksService.create).toHaveBeenCalledWith(dto, ownerUser);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.CreateTask,
          resourceId: mockTask.id,
        })
      );
    });
  });

  describe('PUT /tasks/:id', () => {
    it('updates a task and logs audit event', async () => {
      const updatedTask = { ...mockTask, title: 'Updated' };
      tasksService.update.mockResolvedValue(updatedTask);
      const dto = { title: 'Updated' };
      const req = { ip: '127.0.0.1' };

      const result = await controller.update('task-1', dto as any, ownerUser, req as any);

      expect(result).toEqual(updatedTask);
      expect(tasksService.update).toHaveBeenCalledWith('task-1', dto, ownerUser);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.UpdateTask, resourceId: 'task-1' })
      );
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('removes a task and logs audit event', async () => {
      tasksService.remove.mockResolvedValue(undefined);
      const req = { ip: '127.0.0.1' };

      await controller.remove('task-1', ownerUser, req as any);

      expect(tasksService.remove).toHaveBeenCalledWith('task-1', ownerUser);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.DeleteTask, resourceId: 'task-1' })
      );
    });
  });
});
