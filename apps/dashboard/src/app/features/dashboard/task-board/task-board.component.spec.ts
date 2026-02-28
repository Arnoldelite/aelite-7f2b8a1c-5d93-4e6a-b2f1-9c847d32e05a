import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';
import { TaskBoardComponent } from './task-board.component';
import { TaskService } from '../../../core/services/task.service';
import { AuthService } from '../../../core/services/auth.service';
import { ITask, TaskStatus, TaskCategory, TaskPriority } from '../../../core/models/task.model';
import { Role, IUser } from '../../../core/models/user.model';
import { DragDropModule } from '@angular/cdk/drag-drop';

const makeTask = (overrides: Partial<ITask> = {}): ITask => ({
  id: 'task-1',
  title: 'Test Task',
  status: TaskStatus.Todo,
  category: TaskCategory.Work,
  priority: TaskPriority.Medium,
  order: 0,
  createdById: 'user-1',
  createdByName: 'Jane Doe',
  organizationId: 'org-1',
  organizationName: 'Acme Corp',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const ownerUser: IUser = {
  id: 'user-1',
  email: 'owner@acme.com',
  firstName: 'Jane',
  lastName: 'Doe',
  role: Role.Owner,
  orgId: 'org-1',
  orgName: 'Acme Corp',
};

const viewerUser: IUser = {
  id: 'user-2',
  email: 'viewer@acme.com',
  firstName: 'Bob',
  lastName: 'Smith',
  role: Role.Viewer,
  orgId: 'org-2',
  orgName: 'Acme East',
  parentOrgId: 'org-1',
};

describe('TaskBoardComponent', () => {
  let component: TaskBoardComponent;
  let fixture: ComponentFixture<TaskBoardComponent>;
  let taskService: Partial<TaskService>;
  let authService: Partial<AuthService>;
  let filteredTasksSubject: BehaviorSubject<ITask[]>;

  beforeEach(async () => {
    filteredTasksSubject = new BehaviorSubject<ITask[]>([]);

    taskService = {
      filteredTasks$: filteredTasksSubject.asObservable(),
      updateTask: jest.fn().mockReturnValue(of(makeTask())),
      deleteTask: jest.fn().mockReturnValue(of(undefined)),
    };

    authService = {
      currentUser: ownerUser,
    };

    await TestBed.configureTestingModule({
      imports: [TaskBoardComponent, DragDropModule],
      providers: [
        { provide: TaskService, useValue: taskService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('column structure', () => {
    it('renders 3 kanban columns', () => {
      expect(component.columns).toHaveLength(3);
    });

    it('columns correspond to Todo, InProgress, Done statuses', () => {
      const statuses = component.columns.map((c) => c.status);
      expect(statuses).toEqual([TaskStatus.Todo, TaskStatus.InProgress, TaskStatus.Done]);
    });
  });

  describe('task distribution', () => {
    it('distributes tasks to correct columns', () => {
      const tasks = [
        makeTask({ id: 'task-1', status: TaskStatus.Todo }),
        makeTask({ id: 'task-2', status: TaskStatus.InProgress }),
        makeTask({ id: 'task-3', status: TaskStatus.Done }),
        makeTask({ id: 'task-4', status: TaskStatus.Todo, order: 1 }),
      ];

      filteredTasksSubject.next(tasks);
      fixture.detectChanges();

      const todoCol = component.columns.find((c) => c.status === TaskStatus.Todo)!;
      const progressCol = component.columns.find((c) => c.status === TaskStatus.InProgress)!;
      const doneCol = component.columns.find((c) => c.status === TaskStatus.Done)!;

      expect(todoCol.tasks).toHaveLength(2);
      expect(progressCol.tasks).toHaveLength(1);
      expect(doneCol.tasks).toHaveLength(1);
    });

    it('sorts tasks within a column by order', () => {
      const tasks = [
        makeTask({ id: 'task-b', status: TaskStatus.Todo, order: 2 }),
        makeTask({ id: 'task-a', status: TaskStatus.Todo, order: 0 }),
        makeTask({ id: 'task-c', status: TaskStatus.Todo, order: 1 }),
      ];

      filteredTasksSubject.next(tasks);
      fixture.detectChanges();

      const todoCol = component.columns.find((c) => c.status === TaskStatus.Todo)!;
      expect(todoCol.tasks[0].id).toBe('task-a');
      expect(todoCol.tasks[1].id).toBe('task-c');
      expect(todoCol.tasks[2].id).toBe('task-b');
    });
  });

  describe('RBAC — canEdit', () => {
    it('returns true for Owner role', () => {
      (authService as any).currentUser = ownerUser;
      expect(component.canEdit).toBe(true);
    });

    it('returns true for Admin role', () => {
      (authService as any).currentUser = { ...ownerUser, role: Role.Admin };
      expect(component.canEdit).toBe(true);
    });

    it('returns false for Viewer role', () => {
      (authService as any).currentUser = viewerUser;
      expect(component.canEdit).toBe(false);
    });
  });

  describe('connectedDropLists', () => {
    it('returns array of drop list IDs matching column statuses', () => {
      const ids = component.connectedDropLists;
      expect(ids).toHaveLength(3);
      expect(ids).toContain('drop-' + TaskStatus.Todo);
      expect(ids).toContain('drop-' + TaskStatus.InProgress);
      expect(ids).toContain('drop-' + TaskStatus.Done);
    });
  });

  describe('delete flow', () => {
    it('sets confirmDeleteId on onDeleteClick', () => {
      component.onDeleteClick('task-1');
      expect(component.confirmDeleteId()).toBe('task-1');
    });

    it('clears confirmDeleteId on cancelDelete', () => {
      component.onDeleteClick('task-1');
      component.cancelDelete();
      expect(component.confirmDeleteId()).toBeNull();
    });

    it('calls taskService.deleteTask on confirmDelete', () => {
      component.onDeleteClick('task-1');
      component.confirmDelete();
      expect(taskService.deleteTask).toHaveBeenCalledWith('task-1');
    });
  });

  describe('CSS helper methods', () => {
    it('getPriorityClass returns correct class for each priority', () => {
      expect(component.getPriorityClass(TaskPriority.High)).toBe('priority-high');
      expect(component.getPriorityClass(TaskPriority.Medium)).toBe('priority-medium');
      expect(component.getPriorityClass(TaskPriority.Low)).toBe('priority-low');
    });

    it('getCategoryClass returns correct class for each category', () => {
      expect(component.getCategoryClass(TaskCategory.Work)).toBe('cat-work');
      expect(component.getCategoryClass(TaskCategory.Personal)).toBe('cat-personal');
      expect(component.getCategoryClass(TaskCategory.Other)).toBe('cat-other');
    });
  });
});
