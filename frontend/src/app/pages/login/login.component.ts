import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-bg">
      <div class="card">
        <div class="logo-wrap">
          <div class="logo">₹</div>
          <h1>CreditPlatform</h1>
          <p>Sign in to your account</p>
        </div>

        <form (ngSubmit)="login()">
          <div class="field">
            <label>Email address</label>
            <input type="email" [(ngModel)]="email" name="email" placeholder="rahul@example.com" required>
          </div>
          <div class="field">
            <label>Password</label>
            <input [type]="showPw ? 'text' : 'password'" [(ngModel)]="password" name="password" placeholder="••••••••" required>
            <button type="button" class="eye" (click)="showPw=!showPw">
                {{ showPw ? '🙈' : '👁️' }}
            </button>
          </div>
          <button type="submit" class="btn-primary" [disabled]="loading()">
            {{ loading() ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>

        <p class="footer-link">
          Don't have an account? <a routerLink="/register">Register here</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .page-bg { min-height:100vh; background:linear-gradient(135deg,#eff6ff,#e0e7ff); display:flex; align-items:center; justify-content:center; padding:1rem; }
    .card { background:white; border-radius:1rem; box-shadow:0 20px 60px rgba(0,0,0,.12); width:100%; max-width:420px; padding:2.5rem; }
    .logo-wrap { text-align:center; margin-bottom:2rem; }
    .logo { width:56px; height:56px; background:#2563eb; border-radius:14px; display:flex; align-items:center; justify-content:center; color:white; font-size:1.75rem; font-weight:700; margin:0 auto 0.75rem; }
    h1 { font-size:1.5rem; font-weight:700; color:#111827; }
    p { color:#6b7280; font-size:0.875rem; margin-top:0.25rem; }
    .field { margin-bottom:1.25rem; }
    label { display:block; font-size:0.875rem; font-weight:500; color:#374151; margin-bottom:0.375rem; }
    input { width:100%; border:1.5px solid #d1d5db; border-radius:0.5rem; padding:0.625rem 0.875rem; font-size:0.9rem; outline:none; box-sizing:border-box; }
    input:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
    .btn-primary { width:100%; background:#2563eb; color:white; border:none; border-radius:0.5rem; padding:0.75rem; font-size:0.9rem; font-weight:600; cursor:pointer; margin-top:0.25rem; }
    .btn-primary:hover { background:#1d4ed8; }
    .btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
    .footer-link { text-align:center; font-size:0.875rem; color:#6b7280; margin-top:1.5rem; }
    .footer-link a { color:#2563eb; font-weight:500; text-decoration:none; }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  showPw   = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  login() {
    if (!this.email || !this.password) {
      this.toast.error('Please enter email and password');
      return;
    }
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.toast.success('Welcome back! Redirecting to dashboard...');
        setTimeout(() => this.router.navigate(['/dashboard']), 500);
      },
      error: (e) => {
        const msg = e.error?.error || e.error?.message || 'Login failed. Check your credentials.';
        this.toast.error(msg);
        this.loading.set(false);
      }
    });
  }
}
