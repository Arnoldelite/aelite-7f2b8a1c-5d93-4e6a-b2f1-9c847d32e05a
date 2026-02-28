import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuditService } from '../../../core/services/audit.service';
import { IAuditLog } from '../../../core/models/audit-log.model';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './audit-log.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogComponent implements OnInit, OnDestroy {
  private auditService = inject(AuditService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  logs = signal<IAuditLog[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.auditService.loading$.pipe(takeUntil(this.destroy$)).subscribe((l) => {
      this.loading.set(l);
      this.cdr.markForCheck();
    });

    this.auditService.logs$.pipe(takeUntil(this.destroy$)).subscribe((logs) => {
      this.logs.set(logs);
      this.cdr.markForCheck();
    });

    this.refresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.error.set(null);
    this.auditService.loadLogs(50).subscribe({
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load audit logs.');
        this.cdr.markForCheck();
      },
    });
  }

  getActionColor(action: string): string {
    const map: Record<string, string> = {
      Login: 'badge-blue',
      CreateTask: 'badge-green',
      UpdateTask: 'badge-amber',
      DeleteTask: 'badge-red',
      ViewTasks: 'badge-gray',
      ViewAuditLog: 'badge-purple',
    };
    return map[action] ?? 'badge-gray';
  }

  getActionLabel(action: string): string {
    const map: Record<string, string> = {
      Login: 'Login',
      CreateTask: 'Create',
      UpdateTask: 'Update',
      DeleteTask: 'Delete',
      ViewTasks: 'View',
      ViewAuditLog: 'Audit',
    };
    return map[action] ?? action;
  }
}
