import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { Role, IUser } from '../../../core/models/user.model';
import { NgxParticlesModule } from '@tsparticles/angular';

const mockUser: IUser = {
  id: 'user-1',
  email: 'owner@acme.com',
  firstName: 'Jane',
  lastName: 'Doe',
  role: Role.Owner,
  orgId: 'org-1',
  orgName: 'Acme Corp',
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jest.Mocked<AuthService>;
  let router: jest.Mocked<Router>;

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      logout: jest.fn(),
      currentUser$: of(null),
      isAuthenticated$: of(false),
      currentUser: null,
      token: null,
    } as unknown as jest.Mocked<AuthService>;

    router = {
      navigate: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<Router>;

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule, NgxParticlesModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('form validation', () => {
    it('form is invalid when empty', () => {
      expect(component.loginForm.valid).toBe(false);
    });

    it('form is invalid with email missing', () => {
      component.loginForm.patchValue({ email: '', password: 'Password123!' });
      expect(component.loginForm.valid).toBe(false);
    });

    it('form is invalid with invalid email format', () => {
      component.loginForm.patchValue({ email: 'not-an-email', password: 'Password123!' });
      expect(component.loginForm.get('email')!.valid).toBe(false);
    });

    it('form is invalid when password is too short', () => {
      component.loginForm.patchValue({ email: 'owner@acme.com', password: '12345' });
      expect(component.loginForm.get('password')!.valid).toBe(false);
    });

    it('form is valid with valid email and password', () => {
      component.loginForm.patchValue({ email: 'owner@acme.com', password: 'Password123!' });
      expect(component.loginForm.valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('does not call auth.service.login when form is invalid', () => {
      component.onSubmit();
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('calls auth.service.login with email and password on valid submit', () => {
      authService.login.mockReturnValue(of({ access_token: 'token', user: mockUser }));
      component.loginForm.patchValue({ email: 'owner@acme.com', password: 'Password123!' });

      component.onSubmit();

      expect(authService.login).toHaveBeenCalledWith('owner@acme.com', 'Password123!');
    });

    it('navigates to /dashboard on successful login', () => {
      authService.login.mockReturnValue(of({ access_token: 'token', user: mockUser }));
      component.loginForm.patchValue({ email: 'owner@acme.com', password: 'Password123!' });

      component.onSubmit();

      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('sets error signal on login failure', () => {
      authService.login.mockReturnValue(
        throwError(() => ({ error: { message: 'Invalid credentials' } }))
      );
      component.loginForm.patchValue({ email: 'owner@acme.com', password: 'Password123!' });

      component.onSubmit();

      expect(component.error()).toBe('Invalid credentials');
    });

    it('sets loading to false after successful login', () => {
      authService.login.mockReturnValue(of({ access_token: 'token', user: mockUser }));
      component.loginForm.patchValue({ email: 'owner@acme.com', password: 'Password123!' });

      component.onSubmit();

      expect(component.loading()).toBe(false);
    });

    it('sets loading to false on login error', () => {
      authService.login.mockReturnValue(throwError(() => new Error('error')));
      component.loginForm.patchValue({ email: 'owner@acme.com', password: 'Password123!' });

      component.onSubmit();

      expect(component.loading()).toBe(false);
    });
  });

  describe('fillDemo', () => {
    it('fills owner demo credentials', () => {
      component.fillDemo('owner');
      expect(component.loginForm.value.email).toBe('owner@demo.com');
    });

    it('fills admin demo credentials', () => {
      component.fillDemo('admin');
      expect(component.loginForm.value.email).toBe('admin@demo.com');
    });

    it('fills viewer demo credentials', () => {
      component.fillDemo('viewer');
      expect(component.loginForm.value.email).toBe('viewer@demo.com');
    });
  });

  describe('togglePassword', () => {
    it('toggles showPassword signal', () => {
      expect(component.showPassword()).toBe(false);
      component.togglePassword();
      expect(component.showPassword()).toBe(true);
      component.togglePassword();
      expect(component.showPassword()).toBe(false);
    });
  });
});
