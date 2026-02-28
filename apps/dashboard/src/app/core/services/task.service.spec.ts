import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TaskService } from './task.service';
import { ITask, TaskStatus, TaskCategory, TaskPriority } from '../models/task.model';

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

describe('TaskService', () => {
  let service: TaskService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TaskService],
    });
    service = TestBed.inject(TaskService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loadTasks', () => {
    it('populates tasks$ BehaviorSubject with fetched tasks', (done) => {
      const tasks = [makeTask(), makeTask({ id: 'task-2', title: 'Task 2' })];

      service.loadTasks().subscribe();
      httpMock.expectOne('/tasks').flush(tasks);

      service.tasks$.subscribe((result) => {
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('task-1');
        done();
      });
    });

    it('GET requests /tasks endpoint', () => {
      service.loadTasks().subscribe();

      const req = httpMock.expectOne('/tasks');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('createTask', () => {
    it('appends new task to tasks$ state', (done) => {
      const initial = [makeTask()];
      const newTask = makeTask({ id: 'task-2', title: 'New Task' });

      // Seed initial state
      service.loadTasks().subscribe();
      httpMock.expectOne('/tasks').flush(initial);

      service.createTask({ title: 'New Task' }).subscribe();
      httpMock.expectOne('/tasks').flush(newTask);

      service.tasks$.subscribe((tasks) => {
        if (tasks.length === 2) {
          expect(tasks[1].id).toBe('task-2');
          done();
        }
      });
    });

    it('posts to /tasks endpoint', () => {
      const dto = { title: 'New Task', status: TaskStatus.Todo };
      service.createTask(dto).subscribe();

      const req = httpMock.expectOne('/tasks');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(makeTask());
    });
  });

  describe('deleteTask', () => {
    it('removes task from tasks$ state', (done) => {
      const tasks = [makeTask(), makeTask({ id: 'task-2' })];

      service.loadTasks().subscribe();
      httpMock.expectOne('/tasks').flush(tasks);

      service.deleteTask('task-1').subscribe();
      httpMock.expectOne('/tasks/task-1').flush(null);

      service.tasks$.subscribe((remaining) => {
        if (remaining.length === 1) {
          expect(remaining[0].id).toBe('task-2');
          done();
        }
      });
    });

    it('sends DELETE to /tasks/:id', () => {
      service.deleteTask('task-abc').subscribe();

      const req = httpMock.expectOne('/tasks/task-abc');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('updateTask', () => {
    it('updates existing task in tasks$ state', (done) => {
      const initial = [makeTask()];
      const updated = makeTask({ title: 'Updated Title' });

      service.loadTasks().subscribe();
      httpMock.expectOne('/tasks').flush(initial);

      service.updateTask('task-1', { title: 'Updated Title' }).subscribe();
      httpMock.expectOne('/tasks/task-1').flush(updated);

      service.tasks$.subscribe((tasks) => {
        const found = tasks.find((t) => t.id === 'task-1');
        if (found?.title === 'Updated Title') {
          expect(found.title).toBe('Updated Title');
          done();
        }
      });
    });
  });

  describe('setFilter and filteredTasks$', () => {
    it('filters tasks by status', (done) => {
      const tasks = [
        makeTask({ id: 'task-1', status: TaskStatus.Todo }),
        makeTask({ id: 'task-2', status: TaskStatus.Done }),
      ];

      service.loadTasks().subscribe();
      httpMock.expectOne('/tasks').flush(tasks);

      service.setFilter({ status: TaskStatus.Done });

      service.filteredTasks$.subscribe((filtered) => {
        if (filtered.length === 1) {
          expect(filtered[0].status).toBe(TaskStatus.Done);
          done();
        }
      });
    });

    it('filters tasks by search term', (done) => {
      const tasks = [
        makeTask({ id: 'task-1', title: 'Deploy API' }),
        makeTask({ id: 'task-2', title: 'Write tests' }),
      ];

      service.loadTasks().subscribe();
      httpMock.expectOne('/tasks').flush(tasks);

      service.setFilter({ search: 'deploy' });

      service.filteredTasks$.subscribe((filtered) => {
        if (filtered.length === 1) {
          expect(filtered[0].title).toBe('Deploy API');
          done();
        }
      });
    });
  });

  describe('getTasksByStatus', () => {
    it('returns tasks filtered and sorted by status', () => {
      const tasks = [
        makeTask({ id: 'task-3', status: TaskStatus.Todo, order: 2 }),
        makeTask({ id: 'task-1', status: TaskStatus.Todo, order: 0 }),
        makeTask({ id: 'task-2', status: TaskStatus.Done, order: 0 }),
      ];

      service.loadTasks().subscribe();
      httpMock.expectOne('/tasks').flush(tasks);

      const todoTasks = service.getTasksByStatus(TaskStatus.Todo);
      expect(todoTasks).toHaveLength(2);
      expect(todoTasks[0].id).toBe('task-1'); // order 0 first
      expect(todoTasks[1].id).toBe('task-3'); // order 2 second
    });
  });
});
