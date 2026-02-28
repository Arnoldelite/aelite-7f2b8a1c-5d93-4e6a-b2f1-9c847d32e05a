export enum Role {
  Owner = 'Owner',
  Admin = 'Admin',
  Viewer = 'Viewer',
}

export enum TaskStatus {
  Todo = 'todo',
  InProgress = 'in-progress',
  Done = 'done',
}

export enum TaskCategory {
  Work = 'Work',
  Personal = 'Personal',
  Other = 'Other',
}

export enum TaskPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export enum AuditAction {
  Login = 'LOGIN',
  Register = 'REGISTER',
  CreateTask = 'CREATE_TASK',
  UpdateTask = 'UPDATE_TASK',
  DeleteTask = 'DELETE_TASK',
  ViewTasks = 'VIEW_TASKS',
  ViewAuditLog = 'VIEW_AUDIT_LOG',
  ReorderTask = 'REORDER_TASK',
}
