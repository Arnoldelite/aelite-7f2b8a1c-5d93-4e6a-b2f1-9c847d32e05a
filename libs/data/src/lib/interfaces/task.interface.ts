import { TaskCategory, TaskPriority, TaskStatus } from '../enums.js';

export interface ITask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  category: TaskCategory;
  priority: TaskPriority;
  order: number;
  createdById: string;
  createdByName: string;
  organizationId: string;
  organizationName: string;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAt: Date;
  updatedAt: Date;
}
