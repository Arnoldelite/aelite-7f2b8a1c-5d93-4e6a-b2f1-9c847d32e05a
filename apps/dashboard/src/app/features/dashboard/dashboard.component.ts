import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgxParticlesModule } from '@tsparticles/angular';
import { loadSlim } from '@tsparticles/slim';
import type { Engine } from '@tsparticles/engine';

import { AuthService } from '../../core/services/auth.service';
import { TaskService } from '../../core/services/task.service';
import { ThemeService } from '../../core/services/theme.service';

import { TaskBoardComponent } from './task-board/task-board.component';
import { TaskFormComponent } from './task-form/task-form.component';
import { TaskChartComponent } from './task-chart/task-chart.component';
import { TaskFiltersComponent } from './task-filters/task-filters.component';
import { AuditLogComponent } from './audit-log/audit-log.component';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';

import { ITask } from '../../core/models/task.model';
import { IUser, Role } from '../../core/models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    NgxParticlesModule,
    TaskBoardComponent,
    TaskFormComponent,
    TaskChartComponent,
    TaskFiltersComponent,
    AuditLogComponent,
    ThemeToggleComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private taskService = inject(TaskService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  // State signals
  isModalOpen = signal(false);
  editingTask = signal<ITask | null>(null);
  showChart = signal(true);
  showAuditLog = signal(false);
  showShortcuts = signal(false);
  isSidebarOpen = signal(true);
  isLoading = signal(true);
  loadError = signal<string | null>(null);

  // Current user
  currentUser = signal<IUser | null>(null);

  isDark$ = this.themeService.isDark$;

  private readonly baseParticles = {
    fpsLimit: 60,
    interactivity: {
      events: { onHover: { enable: false }, resize: { enable: true } },
    },
    particles: {
      number: { value: 55, density: { enable: true } },
      links: { enable: true, distance: 160, width: 1 },
      move: {
        enable: true,
        speed: 0.6,
        direction: 'none' as const,
        random: true,
        straight: false,
        outModes: { default: 'bounce' as const },
      },
      size: { value: { min: 1, max: 3 } },
      shape: { type: 'circle' },
    },
    background: { color: { value: 'transparent' } },
    detectRetina: true,
  };

  // Lighter indigo for dark backgrounds
  darkParticlesOptions = {
    ...this.baseParticles,
    particles: {
      ...this.baseParticles.particles,
      color: { value: '#818cf8' },
      links: { ...this.baseParticles.particles.links, color: '#818cf8', opacity: 0.45 },
      opacity: { value: { min: 0.35, max: 0.65 } },
    },
  };

  // Deeper indigo for light backgrounds
  lightParticlesOptions = {
    ...this.baseParticles,
    particles: {
      ...this.baseParticles.particles,
      color: { value: '#4338ca' },
      links: { ...this.baseParticles.particles.links, color: '#4338ca', opacity: 0.4 },
      opacity: { value: { min: 0.3, max: 0.55 } },
    },
  };

  particlesInit = async (engine: Engine): Promise<void> => {
    await loadSlim(engine);
  };

  get canManage(): boolean {
    const role = this.currentUser()?.role;
    return role === Role.Owner || role === Role.Admin;
  }

  get roleLabel(): string {
    return this.currentUser()?.role ?? '';
  }

  get roleBadgeClass(): string {
    const role = this.currentUser()?.role;
    if (role === Role.Owner) return 'badge-owner';
    if (role === Role.Admin) return 'badge-admin';
    return 'badge-viewer';
  }

  get userInitials(): string {
    const u = this.currentUser();
    if (!u) return '?';
    return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();
  }

  get userFullName(): string {
    const u = this.currentUser();
    if (!u) return '';
    return `${u.firstName} ${u.lastName}`;
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    // Don't fire shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

    if (event.key === 'n' && !this.isModalOpen() && !isInput && this.canManage) {
      event.preventDefault();
      this.openCreateModal();
    }
    if (event.key === '?' && !isInput) {
      this.showShortcuts.update((v) => !v);
    }
    if (event.key === 'Escape') {
      if (this.isModalOpen()) this.closeModal();
      if (this.showShortcuts()) this.showShortcuts.set(false);
    }
    if (event.key === 'c' && !isInput) {
      this.showChart.update((v) => !v);
    }
  }

  ngOnInit(): void {
    // Load current user
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.currentUser.set(user);
      this.cdr.markForCheck();
    });

    // Load tasks
    this.taskService.loadTasks().subscribe({
      next: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.loadError.set(err?.error?.message || 'Failed to load tasks. Please refresh.');
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openCreateModal(): void {
    this.editingTask.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(task: ITask): void {
    this.editingTask.set(task);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingTask.set(null);
  }

  onTaskSaved(_task: ITask): void {
    this.closeModal();
  }

  toggleChart(): void {
    this.showChart.update((v) => !v);
  }

  toggleAuditLog(): void {
    this.showAuditLog.update((v) => !v);
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update((v) => !v);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  retryLoad(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.taskService.loadTasks().subscribe({
      next: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.loadError.set(err?.error?.message || 'Failed to load tasks.');
        this.cdr.markForCheck();
      },
    });
  }
}
