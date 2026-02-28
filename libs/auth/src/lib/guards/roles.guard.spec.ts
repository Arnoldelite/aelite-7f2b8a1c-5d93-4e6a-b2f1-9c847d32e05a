import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '@org/data';
import { ROLES_KEY } from '../constants.js';

const makeContext = (userRole: Role | null, handlerRoles?: Role[], classRoles?: Role[]): ExecutionContext => {
  const reflector = {
    getAllAndOverride: (key: string, targets: any[]) => {
      if (key === ROLES_KEY) return handlerRoles ?? classRoles ?? undefined;
      return undefined;
    },
  } as unknown as Reflector;

  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: userRole ? { role: userRole } : null,
      }),
    }),
    // Store reflector for guard constructor injection
    _reflector: reflector,
  } as unknown as ExecutionContext;
};

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: Role.Viewer } }) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user has correct role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Owner, Role.Admin]);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: Role.Owner } }) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies access when user role is not in required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Owner, Role.Admin]);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: Role.Viewer } }) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('denies access when user is null', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Owner]);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: null }) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('allows Admin access to Admin-or-Owner protected endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Owner, Role.Admin]);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: Role.Admin } }) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when requiredRoles is empty array', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: Role.Viewer } }) }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
