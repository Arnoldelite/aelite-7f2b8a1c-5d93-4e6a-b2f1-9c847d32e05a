export enum AuditAction {
  Login = 'Login',
  CreateTask = 'CreateTask',
  UpdateTask = 'UpdateTask',
  DeleteTask = 'DeleteTask',
  ViewTasks = 'ViewTasks',
  ViewAuditLog = 'ViewAuditLog',
}

export interface IAuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}
