import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { Role } from '@org/data';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    process.env['JWT_SECRET'] = 'test-secret';
    strategy = new JwtStrategy();
  });

  describe('validate', () => {
    it('returns the payload when it contains a valid sub', () => {
      const payload = {
        sub: 'user-1',
        email: 'owner@acme.com',
        role: Role.Owner,
        orgId: 'org-1',
        parentOrgId: null,
      };

      const result = strategy.validate(payload);

      expect(result).toEqual(payload);
    });

    it('throws UnauthorizedException when payload has no sub', () => {
      const invalidPayload = { email: 'bad@acme.com', role: Role.Viewer, orgId: 'org-1' } as any;

      expect(() => strategy.validate(invalidPayload)).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when payload is null', () => {
      expect(() => strategy.validate(null as any)).toThrow(UnauthorizedException);
    });

    it('returns payload with all expected fields intact', () => {
      const payload = {
        sub: 'user-2',
        email: 'admin@acme.com',
        role: Role.Admin,
        orgId: 'org-2',
        parentOrgId: 'org-1',
      };

      const result = strategy.validate(payload);

      expect(result.sub).toBe('user-2');
      expect(result.role).toBe(Role.Admin);
      expect(result.parentOrgId).toBe('org-1');
    });
  });
});
