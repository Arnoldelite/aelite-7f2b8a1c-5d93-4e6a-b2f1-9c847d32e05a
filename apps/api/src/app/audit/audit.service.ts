import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditAction } from '@org/data';

export interface LogEntry {
  userId: string;
  userEmail: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(entry: LogEntry): Promise<void> {
    const log = this.repo.create({
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId ?? null,
      details: entry.details ? JSON.stringify(entry.details) : null,
      ipAddress: entry.ipAddress ?? null,
    });
    await this.repo.save(log);
    // Also log to console for observability
    console.log(`[AUDIT] ${entry.userEmail} → ${entry.action} on ${entry.resource}${entry.resourceId ? ':' + entry.resourceId : ''}`);
  }

  findAll(): Promise<AuditLog[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }
}
