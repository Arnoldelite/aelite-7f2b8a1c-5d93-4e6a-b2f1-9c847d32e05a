import { TaskCategory, TaskPriority, TaskStatus } from '../enums.js';

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  category?: TaskCategory;
  priority?: TaskPriority;
  assignedToId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  category?: TaskCategory;
  priority?: TaskPriority;
  assignedToId?: string;
  order?: number;
}

export interface ReorderTaskDto {
  status: TaskStatus;
  order: number;
}
