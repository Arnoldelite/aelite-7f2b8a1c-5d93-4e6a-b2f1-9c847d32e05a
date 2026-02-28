import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskStatus, TaskCategory, TaskPriority } from '@org/data';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ nullable: true, type: 'varchar' })
  description!: string | null;

  @Column({ type: 'varchar', default: TaskStatus.Todo })
  status!: TaskStatus;

  @Column({ type: 'varchar', default: TaskCategory.Work })
  category!: TaskCategory;

  @Column({ type: 'varchar', default: TaskPriority.Medium })
  priority!: TaskPriority;

  @Column({ type: 'integer', default: 0 })
  order!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column()
  createdById!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @Column()
  organizationId!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo!: User | null;

  @Column({ nullable: true, type: 'varchar' })
  assignedToId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
