import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { Role, IUser, LoginResponse } from '../models/user.model';

const mockUser: IUser = {
  id: 'user-1',
  email: 'owner@acme.com',
  firstName: 'Jane',
  lastName: 'Doe',
  role: Role.Owner,
  orgId: 'org-1',
  orgName: 'Acme Corp',
  parentOrgId: undefined,
};

const mockLoginResponse: LoginResponse = {
  access_token: 'mock-jwt-token',
  user: mockUser,
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('initial state', () => {
    it('starts with null currentUser when localStorage is empty', () => {
      expect(service.currentUser).toBeNull();
    });

    it('isAuthenticated$ emits false when not logged in', (done) => {
      service.isAuthenticated$.subscribe((val) => {
        expect(val).toBe(false);
        done();
      });
    });
  });

  describe('login', () => {
    it('sets token and user in localStorage on successful login', () => {
      service.login('owner@acme.com', 'Password123!').subscribe();

      const req = httpMock.expectOne('/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'owner@acme.com', password: 'Password123!' });
      req.flush(mockLoginResponse);

      expect(localStorage.getItem('token')).toBe('mock-jwt-token');
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockUser);
    });

    it('updates currentUser$ BehaviorSubject on successful login', (done) => {
      let emitCount = 0;
      service.currentUser$.subscribe((user) => {
        emitCount++;
        if (emitCount === 2) {
          // Second emission after login
          expect(user).toEqual(mockUser);
          done();
        }
      });

      service.login('owner@acme.com', 'Password123!').subscribe();
      httpMock.expectOne('/auth/login').flush(mockLoginResponse);
    });

    it('isAuthenticated$ emits true after successful login', (done) => {
      let emitCount = 0;
      service.isAuthenticated$.subscribe((val) => {
        emitCount++;
        if (emitCount === 2) {
          expect(val).toBe(true);
          done();
        }
      });

      service.login('owner@acme.com', 'Password123!').subscribe();
      httpMock.expectOne('/auth/login').flush(mockLoginResponse);
    });

    it('posts to /auth/login endpoint', () => {
      service.login('test@acme.com', 'pass').subscribe();

      const req = httpMock.expectOne('/auth/login');
      expect(req.request.url).toBe('/auth/login');
      req.flush(mockLoginResponse);
    });
  });

  describe('logout', () => {
    it('clears localStorage and emits null to currentUser$', (done) => {
      // Simulate logged-in state
      localStorage.setItem('token', 'some-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      let emitCount = 0;
      service.currentUser$.subscribe((user) => {
        emitCount++;
        if (emitCount === 1) {
          // Initial null emission
          service.logout();
        } else {
          expect(user).toBeNull();
          expect(localStorage.getItem('token')).toBeNull();
          expect(localStorage.getItem('user')).toBeNull();
          done();
        }
      });
    });

    it('isAuthenticated$ emits false after logout', (done) => {
      service.login('owner@acme.com', 'Password123!').subscribe();
      httpMock.expectOne('/auth/login').flush(mockLoginResponse);

      let emitCount = 0;
      service.isAuthenticated$.subscribe((val) => {
        emitCount++;
        if (emitCount === 1) {
          // After login: true
          expect(val).toBe(true);
          service.logout();
        } else {
          expect(val).toBe(false);
          done();
        }
      });
    });
  });

  describe('token getter', () => {
    it('returns null when no token stored', () => {
      expect(service.token).toBeNull();
    });

    it('returns token from localStorage', () => {
      localStorage.setItem('token', 'my-token');
      expect(service.token).toBe('my-token');
    });
  });
});
