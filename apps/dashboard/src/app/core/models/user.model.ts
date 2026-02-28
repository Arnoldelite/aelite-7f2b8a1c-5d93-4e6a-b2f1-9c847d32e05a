export enum Role {
  Owner = 'Owner',
  Admin = 'Admin',
  Viewer = 'Viewer',
}

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  orgId: string;
  orgName: string;
  parentOrgId?: string;
}

export interface IJwtPayload {
  sub: string;
  email: string;
  role: Role;
  orgId: string;
  parentOrgId?: string;
}

export interface LoginResponse {
  access_token: string;
  user: IUser;
}

export interface LoginDto {
  email: string;
  password: string;
}
