import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Role } from '@org/data';

const mockOrg = {
  id: 'org-1',
  name: 'Acme Corp',
  parentOrganizationId: null,
};

const mockUser = {
  id: 'user-1',
  email: 'owner@acme.com',
  password: 'hashed-password',
  firstName: 'Jane',
  lastName: 'Doe',
  organizationId: 'org-1',
  organization: mockOrg,
  role: { id: 'role-1', name: Role.Owner },
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('validateUser', () => {
    it('returns user when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser('owner@acme.com', 'Password123!');

      expect(result).toEqual(mockUser);
      expect(usersService.findByEmail).toHaveBeenCalledWith('owner@acme.com');
    });

    it('throws UnauthorizedException when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.validateUser('unknown@acme.com', 'Password123!')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.validateUser('owner@acme.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('login', () => {
    it('returns access_token and user on successful login', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login({ email: 'owner@acme.com', password: 'Password123!' });

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user).toMatchObject({
        id: 'user-1',
        email: 'owner@acme.com',
        role: Role.Owner,
        orgId: 'org-1',
      });
    });

    it('JWT payload contains correct fields', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await service.login({ email: 'owner@acme.com', password: 'Password123!' });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          email: 'owner@acme.com',
          role: Role.Owner,
          orgId: 'org-1',
          parentOrgId: null,
        })
      );
    });
  });

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(
        service.register({
          email: 'owner@acme.com',
          password: 'Password123!',
          firstName: 'Jane',
          lastName: 'Doe',
          organizationId: 'org-1',
          roleId: 'role-1',
        })
      ).rejects.toThrow(ConflictException);
    });

    it('hashes password and creates user on successful register', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.save.mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      const result = await service.register({
        email: 'new@acme.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        organizationId: 'org-1',
        roleId: 'role-1',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
      expect(usersService.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@acme.com', password: 'hashed' })
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('getMe', () => {
    it('returns the JWT payload unchanged', () => {
      const payload = { sub: 'user-1', email: 'owner@acme.com', role: Role.Owner, orgId: 'org-1' };
      expect(service.getMe(payload)).toEqual(payload);
    });
  });
});
