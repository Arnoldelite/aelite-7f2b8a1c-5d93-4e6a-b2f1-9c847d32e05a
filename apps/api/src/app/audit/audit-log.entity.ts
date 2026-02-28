import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { AuditAction } from '@org/data';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  userEmail!: string;

  @Column({ type: 'varchar' })
  action!: AuditAction;

  @Column()
  resource!: string;

  @Column({ nullable: true, type: 'varchar' })
  resourceId!: string | null;

  @Column({ nullable: true, type: 'text' })
  details!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  ipAddress!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
