import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TaskService } from '../../../core/services/task.service';
import { AuthService } from '../../../core/services/auth.service';
import { ITask, TaskStatus, TaskCategory, TaskPriority } from '../../../core/models/task.model';
import { Role } from '../../../core/models/user.model';

interface KanbanColumn {
  status: TaskStatus;
  label: string;
  colorClass: string;
  headerClass: string;
  tasks: ITask[];
}

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, DatePipe],
  templateUrl: './task-board.component.html',
  styleUrl: './task-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskBoardComponent implements OnInit, OnDestroy {
  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  @Output() editTask = new EventEmitter<ITask>();
  @Output() createTask = new EventEmitter<void>();

  TaskStatus = TaskStatus;

  columns: KanbanColumn[] = [
    { status: TaskStatus.Todo, label: 'Todo', colorClass: 'col-todo', headerClass: 'header-todo', tasks: [] },
    { status: TaskStatus.InProgress, label: 'In Progress', colorClass: 'col-progress', headerClass: 'header-progress', tasks: [] },
    { status: TaskStatus.Done, label: 'Done', colorClass: 'col-done', headerClass: 'header-done', tasks: [] },
  ];

  confirmDeleteId = signal<string | null>(null);

  get canEdit(): boolean {
    const role = this.authService.currentUser?.role;
    return role === Role.Owner || role === Role.Admin;
  }

  get connectedDropLists(): string[] {
    return this.columns.map((c) => 'drop-' + c.status);
  }

  ngOnInit(): void {
    this.taskService.filteredTasks$.pipe(takeUntil(this.destroy$)).subscribe((tasks) => {
      this.distributeTasksToColumns(tasks);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private distributeTasksToColumns(tasks: ITask[]): void {
    for (const col of this.columns) {
      col.tasks = tasks
        .filter((t) => t.status === col.status)
        .sort((a, b) => a.order - b.order);
    }
  }

  onDrop(event: CdkDragDrop<ITask[]>, targetStatus: TaskStatus): void {
    if (event.previousContainer === event.container) {
      // Reorder within same column
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      const task = event.container.data[event.currentIndex];
      this.taskService.updateTask(task.id, { order: event.currentIndex }).subscribe();
    } else {
      // Move to different column
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      const task = event.container.data[event.currentIndex];
      this.taskService.updateTask(task.id, {
        status: targetStatus,
        order: event.currentIndex,
      }).subscribe();
    }
  }

  onEditTask(task: ITask): void {
    this.editTask.emit(task);
  }

  onDeleteClick(id: string): void {
    this.confirmDeleteId.set(id);
  }

  confirmDelete(): void {
    const id = this.confirmDeleteId();
    if (!id) return;
    this.taskService.deleteTask(id).subscribe({
      next: () => {
        this.confirmDeleteId.set(null);
      },
      error: () => {
        this.confirmDeleteId.set(null);
      },
    });
  }

  cancelDelete(): void {
    this.confirmDeleteId.set(null);
  }

  getPriorityClass(priority: TaskPriority): string {
    const map: Record<TaskPriority, string> = {
      [TaskPriority.High]: 'priority-high',
      [TaskPriority.Medium]: 'priority-medium',
      [TaskPriority.Low]: 'priority-low',
    };
    return map[priority] ?? '';
  }

  getCategoryClass(category: TaskCategory): string {
    const map: Record<TaskCategory, string> = {
      [TaskCategory.Work]: 'cat-work',
      [TaskCategory.Personal]: 'cat-personal',
      [TaskCategory.Other]: 'cat-other',
    };
    return map[category] ?? '';
  }

  getPriorityLabel(priority: TaskPriority): string {
    const map: Record<TaskPriority, string> = {
      [TaskPriority.High]: 'High',
      [TaskPriority.Medium]: 'Medium',
      [TaskPriority.Low]: 'Low',
    };
    return map[priority] ?? priority;
  }

  trackByTaskId(_: number, task: ITask): string {
    return task.id;
  }
}
