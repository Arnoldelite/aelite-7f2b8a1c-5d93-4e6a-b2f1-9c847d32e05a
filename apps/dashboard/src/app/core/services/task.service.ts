import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import {
  ITask,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilter,
  TaskStatus,
  TaskCategory,
  TaskPriority,
} from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);

  private tasksSubject = new BehaviorSubject<ITask[]>([]);
  tasks$ = this.tasksSubject.asObservable();

  private filterSubject = new BehaviorSubject<TaskFilter>({});
  filter$ = this.filterSubject.asObservable();

  filteredTasks$ = combineLatest([this.tasks$, this.filterSubject]).pipe(
    map(([tasks, filter]) => this.applyFilter(tasks, filter))
  );

  loadTasks(): Observable<ITask[]> {
    return this.http.get<ITask[]>('/tasks').pipe(
      tap((tasks) => this.tasksSubject.next(tasks))
    );
  }

  createTask(dto: CreateTaskDto): Observable<ITask> {
    return this.http.post<ITask>('/tasks', dto).pipe(
      tap((task) => this.addTaskToState(task))
    );
  }

  updateTask(id: string, dto: UpdateTaskDto): Observable<ITask> {
    return this.http.patch<ITask>(`/tasks/${id}`, dto).pipe(
      tap((task) => this.updateTaskInState(task))
    );
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`/tasks/${id}`).pipe(
      tap(() => this.removeTaskFromState(id))
    );
  }

  setFilter(filter: TaskFilter): void {
    this.filterSubject.next(filter);
  }

  getTasksByStatus(status: TaskStatus): ITask[] {
    return this.tasksSubject.value
      .filter((t) => t.status === status)
      .sort((a, b) => a.order - b.order);
  }

  private applyFilter(tasks: ITask[], filter: TaskFilter): ITask[] {
    return tasks.filter((task) => {
      if (filter.status && task.status !== filter.status) return false;
      if (filter.category && task.category !== filter.category) return false;
      if (filter.priority && task.priority !== filter.priority) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q) ?? false;
        const matchAssignee = task.assignedToName?.toLowerCase().includes(q) ?? false;
        if (!matchTitle && !matchDesc && !matchAssignee) return false;
      }
      return true;
    });
  }

  private addTaskToState(task: ITask): void {
    const current = this.tasksSubject.value;
    this.tasksSubject.next([...current, task]);
  }

  private updateTaskInState(task: ITask): void {
    const current = this.tasksSubject.value;
    const idx = current.findIndex((t) => t.id === task.id);
    if (idx !== -1) {
      const updated = [...current];
      updated[idx] = task;
      this.tasksSubject.next(updated);
    }
  }

  private removeTaskFromState(id: string): void {
    const current = this.tasksSubject.value;
    this.tasksSubject.next(current.filter((t) => t.id !== id));
  }

  updateLocalTaskStatus(taskId: string, status: TaskStatus, order: number): void {
    const current = this.tasksSubject.value;
    const idx = current.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      const updated = [...current];
      updated[idx] = { ...updated[idx], status, order };
      this.tasksSubject.next(updated);
    }
  }

  updateLocalTaskOrder(taskId: string, order: number): void {
    const current = this.tasksSubject.value;
    const idx = current.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      const updated = [...current];
      updated[idx] = { ...updated[idx], order };
      this.tasksSubject.next(updated);
    }
  }
}
