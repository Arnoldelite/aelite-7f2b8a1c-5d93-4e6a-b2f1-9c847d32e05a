import {
  Component,
  inject,
  Input,
  Output,
  EventEmitter,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import {
  ITask,
  CreateTaskDto,
  UpdateTaskDto,
  TaskStatus,
  TaskCategory,
  TaskPriority,
} from '../../../core/models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);

  @Input() task: ITask | null = null;
  @Output() saved = new EventEmitter<ITask>();
  @Output() cancelled = new EventEmitter<void>();

  loading = signal(false);
  error = signal<string | null>(null);

  TaskStatus = TaskStatus;
  TaskCategory = TaskCategory;
  TaskPriority = TaskPriority;

  get isEditMode(): boolean {
    return !!this.task;
  }

  taskForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    description: [''],
    status: [TaskStatus.Todo as string],
    category: [TaskCategory.Work as string],
    priority: [TaskPriority.Medium as string],
    assignedToId: [''],
  });

  ngOnInit(): void {
    if (this.task) {
      this.taskForm.patchValue({
        title: this.task.title,
        description: this.task.description ?? '',
        status: this.task.status,
        category: this.task.category,
        priority: this.task.priority,
        assignedToId: this.task.assignedToId ?? '',
      });
    }
  }

  onSubmit(): void {
    if (this.taskForm.invalid || this.loading()) return;

    const val = this.taskForm.value;
    this.loading.set(true);
    this.error.set(null);

    if (this.isEditMode && this.task) {
      const dto: UpdateTaskDto = {
        title: val.title ?? undefined,
        description: val.description || undefined,
        status: (val.status as TaskStatus) || undefined,
        category: (val.category as TaskCategory) || undefined,
        priority: (val.priority as TaskPriority) || undefined,
        assignedToId: val.assignedToId || undefined,
      };

      this.taskService.updateTask(this.task.id, dto).subscribe({
        next: (updated) => {
          this.loading.set(false);
          this.saved.emit(updated);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Failed to update task.');
        },
      });
    } else {
      const dto: CreateTaskDto = {
        title: val.title!,
        description: val.description || undefined,
        status: (val.status as TaskStatus) || TaskStatus.Todo,
        category: (val.category as TaskCategory) || TaskCategory.Work,
        priority: (val.priority as TaskPriority) || TaskPriority.Medium,
        assignedToId: val.assignedToId || undefined,
      };

      this.taskService.createTask(dto).subscribe({
        next: (created) => {
          this.loading.set(false);
          this.saved.emit(created);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Failed to create task.');
        },
      });
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
