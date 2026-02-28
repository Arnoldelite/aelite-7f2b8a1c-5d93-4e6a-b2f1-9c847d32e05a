import { Role } from '../enums.js';

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  orgId: string;
  orgName: string;
  parentOrgId: string | null;
  createdAt: Date;
}

export interface IJwtPayload {
  sub: string;
  email: string;
  role: Role;
  orgId: string;
  parentOrgId: string | null;
  iat?: number;
  exp?: number;
}
