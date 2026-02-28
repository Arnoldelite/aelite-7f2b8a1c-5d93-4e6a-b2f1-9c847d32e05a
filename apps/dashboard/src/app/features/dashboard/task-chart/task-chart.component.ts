import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TaskService } from '../../../core/services/task.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ITask, TaskStatus, TaskCategory } from '../../../core/models/task.model';
import type { ChartData, ChartOptions } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

type ChartTab = 'status' | 'category';

@Component({
  selector: 'app-task-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './task-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskChartComponent implements OnInit, OnDestroy {
  private taskService = inject(TaskService);
  private themeService = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  activeTab = signal<ChartTab>('status');
  isDark = signal(false);

  statusChartData: ChartData<'bar'> = {
    labels: ['Todo', 'In Progress', 'Done'],
    datasets: [
      {
        label: 'Tasks by Status',
        data: [0, 0, 0],
        backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(16, 185, 129, 0.8)'],
        borderColor: ['#6366f1', '#f59e0b', '#10b981'],
        borderWidth: 2,
        borderRadius: 6,
      },
    ],
  };

  categoryChartData: ChartData<'bar'> = {
    labels: ['Work', 'Personal', 'Other'],
    datasets: [
      {
        label: 'Tasks by Category',
        data: [0, 0, 0],
        backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(107, 114, 128, 0.8)'],
        borderColor: ['#3b82f6', '#8b5cf6', '#6b7280'],
        borderWidth: 2,
        borderRadius: 6,
      },
    ],
  };

  get chartData(): ChartData<'bar'> {
    return this.activeTab() === 'status' ? this.statusChartData : this.categoryChartData;
  }

  get chartOptions(): ChartOptions<'bar'> {
    const textColor = this.isDark() ? '#f9fafb' : '#111827';
    const gridColor = this.isDark() ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: this.isDark() ? '#1f2937' : '#111827',
          titleColor: '#f9fafb',
          bodyColor: '#d1d5db',
          padding: 12,
          borderColor: 'rgba(99, 102, 241, 0.5)',
          borderWidth: 1,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
            font: { family: 'Inter', weight: 500 },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
            font: { family: 'Inter' },
            stepSize: 1,
          },
        },
      },
      animation: {
        duration: 500,
      },
    };
  }

  ngOnInit(): void {
    this.taskService.tasks$.pipe(takeUntil(this.destroy$)).subscribe((tasks) => {
      this.updateCharts(tasks);
      this.cdr.markForCheck();
    });

    this.themeService.isDark$.pipe(takeUntil(this.destroy$)).subscribe((dark) => {
      this.isDark.set(dark);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: ChartTab): void {
    this.activeTab.set(tab);
  }

  private updateCharts(tasks: ITask[]): void {
    // Status counts
    const todo = tasks.filter((t) => t.status === TaskStatus.Todo).length;
    const inProgress = tasks.filter((t) => t.status === TaskStatus.InProgress).length;
    const done = tasks.filter((t) => t.status === TaskStatus.Done).length;

    this.statusChartData = {
      ...this.statusChartData,
      datasets: [
        {
          ...this.statusChartData.datasets[0],
          data: [todo, inProgress, done],
        },
      ],
    };

    // Category counts
    const work = tasks.filter((t) => t.category === TaskCategory.Work).length;
    const personal = tasks.filter((t) => t.category === TaskCategory.Personal).length;
    const other = tasks.filter((t) => t.category === TaskCategory.Other).length;

    this.categoryChartData = {
      ...this.categoryChartData,
      datasets: [
        {
          ...this.categoryChartData.datasets[0],
          data: [work, personal, other],
        },
      ],
    };
  }
}
