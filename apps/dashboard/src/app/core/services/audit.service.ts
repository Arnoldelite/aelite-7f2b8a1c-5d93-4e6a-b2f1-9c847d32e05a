import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { IAuditLog } from '../models/audit-log.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private http = inject(HttpClient);

  private logsSubject = new BehaviorSubject<IAuditLog[]>([]);
  logs$ = this.logsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  loadLogs(limit = 50): Observable<IAuditLog[]> {
    this.loadingSubject.next(true);
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<IAuditLog[]>('/audit', { params }).pipe(
      tap({
        next: (logs) => {
          this.logsSubject.next(logs);
          this.loadingSubject.next(false);
        },
        error: () => {
          this.loadingSubject.next(false);
        },
      })
    );
  }

  clearLogs(): void {
    this.logsSubject.next([]);
  }
}
