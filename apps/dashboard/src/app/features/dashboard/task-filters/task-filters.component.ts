import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TaskService } from '../../../core/services/task.service';
import { TaskFilter, TaskStatus, TaskCategory, TaskPriority } from '../../../core/models/task.model';

@Component({
  selector: 'app-task-filters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFiltersComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private destroy$ = new Subject<void>();

  hasActiveFilters = signal(false);

  TaskStatus = TaskStatus;
  TaskCategory = TaskCategory;
  TaskPriority = TaskPriority;

  filterForm = this.fb.group({
    search: [''],
    status: [''],
    category: [''],
    priority: [''],
  });

  ngOnInit(): void {
    // Debounce search input
    this.filterForm.get('search')!.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.applyFilters());

    // Immediate apply for dropdowns
    ['status', 'category', 'priority'].forEach(field => {
      this.filterForm.get(field)!.valueChanges.pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => this.applyFilters());
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilters(): void {
    const val = this.filterForm.value;
    const filter: TaskFilter = {};

    if (val.search?.trim()) filter.search = val.search.trim();
    if (val.status) filter.status = val.status as TaskStatus;
    if (val.category) filter.category = val.category as TaskCategory;
    if (val.priority) filter.priority = val.priority as TaskPriority;

    const isActive = !!(filter.search || filter.status || filter.category || filter.priority);
    this.hasActiveFilters.set(isActive);
    this.taskService.setFilter(filter);
  }

  clearFilters(): void {
    this.filterForm.reset({ search: '', status: '', category: '', priority: '' });
    this.hasActiveFilters.set(false);
    this.taskService.setFilter({});
  }
}
