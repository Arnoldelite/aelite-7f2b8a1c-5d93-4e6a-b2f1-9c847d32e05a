import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgxParticlesModule } from '@tsparticles/angular';
import { loadSlim } from '@tsparticles/slim';
import type { Container, Engine } from '@tsparticles/engine';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgxParticlesModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);
  particlesInitialized = signal(false);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  particlesId = 'tsparticles';

  particlesOptions = {
    fpsLimit: 60,
    interactivity: {
      events: {
        onHover: {
          enable: true,
          mode: 'repulse',
        },
        resize: { enable: true },
      },
      modes: {
        repulse: {
          distance: 100,
          duration: 0.4,
        },
      },
    },
    particles: {
      number: {
        value: 80,
        density: {
          enable: true,
        },
      },
      color: {
        value: '#6366f1',
      },
      links: {
        enable: true,
        color: '#6366f1',
        opacity: 0.3,
        distance: 150,
        width: 1,
      },
      move: {
        enable: true,
        speed: 1,
        direction: 'none' as const,
        random: false,
        straight: false,
        outModes: {
          default: 'bounce' as const,
        },
      },
      size: {
        value: { min: 1, max: 3 },
      },
      opacity: {
        value: { min: 0.3, max: 0.7 },
      },
      shape: {
        type: 'circle',
      },
    },
    background: {
      color: {
        value: 'transparent',
      },
    },
    detectRetina: true,
  };

  ngOnInit(): void {
    // Particles initialized via the particlesInit input callback
  }

  // Arrow function so it can be passed as [particlesInit] input binding
  particlesInit = async (engine: Engine): Promise<void> => {
    await loadSlim(engine);
  };

  particlesLoaded(container: Container | undefined): void {
    this.particlesInitialized.set(true);
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  fillDemo(role: 'owner' | 'admin' | 'viewer'): void {
    const creds = {
      owner: { email: 'owner@acme.com', password: 'Password123!' },
      admin: { email: 'admin@acme.com', password: 'Password123!' },
      viewer: { email: 'viewer@acme.com', password: 'Password123!' },
    };
    this.loginForm.patchValue(creds[role]);
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.loading()) return;

    const { email, password } = this.loginForm.value;
    if (!email || !password) return;

    this.loading.set(true);
    this.error.set(null);

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err?.error?.message || 'Invalid credentials. Please try again.'
        );
      },
    });
  }
}
