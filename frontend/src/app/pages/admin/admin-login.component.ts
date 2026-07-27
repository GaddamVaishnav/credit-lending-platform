import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../shared/toast.service';

// Hard-coded admin credentials (for demo)
const ADMIN_EMAIL    = 'admin@creditplatform.com';
const ADMIN_PASSWORD = 'Admin@1234';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-bg">
      <div class="card">
        <div class="logo-wrap">
          <div class="logo">ðŸ”</div>
          <h1>Admin Portal</h1>
          <p>CreditPlatform â€” Restricted Access</p>
        </div>

        <div class="alert-warning">
          âš ï¸ This portal is for authorized administrators only.
          Unauthorized access is strictly prohibited.
        </div>

        <form (ngSubmit)="login()">
          <div class="field">
            <label>Admin Email</label>
            <input type="email" [(ngModel)]="email" name="email"
              placeholder="admin@creditplatform.com" required
              [class.error-input]="error()">
          </div>
          <div class="field">
            <label>Admin Password</label>
            <div class="pw-wrap">
              <input [type]="showPw ? 'text' : 'password'"
                [(ngModel)]="password" name="password"
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required
                [class.error-input]="error()">
              <button type="button" class="eye" (click)="showPw=!showPw">
                {{ showPw ? 'ðŸ™ˆ' : 'ðŸ‘ï¸' }}
              </button>
            </div>
          </div>

          <div class="error-box" *ngIf="error()">
            âŒ {{ error() }}
          </div>

          <button type="submit" class="btn-admin" [disabled]="loading()">
            {{ loading() ? 'Authenticating...' : 'ðŸ” Login as Admin' }}
          </button>
        </form>

        <div class="demo-hint">
          <strong>Demo credentials:</strong><br>
          Email: admin&#64;creditplatform.com<br>
          Password: Admin&#64;1234
        </div>

        <p class="back-link">
          <a routerLink="/login">â† Back to customer login</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .page-bg { min-height:100vh; background:linear-gradient(135deg,#1e293b,#0f172a); display:flex; align-items:center; justify-content:center; padding:1rem; }
    .card { background:white; border-radius:1rem; box-shadow:0 25px 60px rgba(0,0,0,.4); width:100%; max-width:400px; padding:2.5rem; }
    .logo-wrap { text-align:center; margin-bottom:1.5rem; }
    .logo { width:60px; height:60px; background:#1e293b; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:1.75rem; margin:0 auto 0.75rem; }
    h1 { font-size:1.5rem; font-weight:700; color:#0f172a; }
    p { color:#64748b; font-size:0.875rem; margin-top:0.25rem; }
    .alert-warning { background:#fffbeb; border:1px solid #fde047; color:#92400e; border-radius:0.5rem; padding:0.75rem; margin-bottom:1.25rem; font-size:0.78rem; }
    .field { margin-bottom:1rem; }
    label { display:block; font-size:0.825rem; font-weight:600; color:#374151; margin-bottom:0.35rem; }
    input { width:100%; border:1.5px solid #d1d5db; border-radius:0.5rem; padding:0.625rem 0.875rem; font-size:0.875rem; outline:none; box-sizing:border-box; }
    input:focus { border-color:#1e293b; box-shadow:0 0 0 3px rgba(30,41,59,.1); }
    .error-input { border-color:#ef4444 !important; }
    .pw-wrap { position:relative; }
    .pw-wrap input { padding-right:2.5rem; }
    .eye { position:absolute; right:0.75rem; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; font-size:1rem; }
    .error-box { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; border-radius:0.5rem; padding:0.75rem; margin-bottom:1rem; font-size:0.8rem; }
    .btn-admin { width:100%; background:#1e293b; color:white; border:none; border-radius:0.5rem; padding:0.875rem; font-size:0.9rem; font-weight:600; cursor:pointer; letter-spacing:0.025rem; }
    .btn-admin:hover { background:#334155; }
    .btn-admin:disabled { opacity:0.5; cursor:not-allowed; }
    .demo-hint { background:#f8fafc; border:1px solid #e2e8f0; border-radius:0.5rem; padding:0.875rem; margin-top:1.25rem; font-size:0.78rem; color:#475569; text-align:center; line-height:1.8; }
    .back-link { text-align:center; margin-top:1rem; font-size:0.8rem; }
    .back-link a { color:#2563eb; text-decoration:none; }
  `]
})
export class AdminLoginComponent {
  email    = '';
  password = '';
  loading  = signal(false);
  error    = signal('');
  showPw   = false;

  constructor(private router: Router, private toast: ToastService) {}

  login() {
    this.error.set('');
    this.loading.set(true);

    setTimeout(() => {
      if (this.email === ADMIN_EMAIL && this.password === ADMIN_PASSWORD) {
        // Store admin session
        localStorage.setItem('adminToken', btoa(`${this.email}:${Date.now()}`));
        localStorage.setItem('isAdmin', 'true');
        this.toast.success('âœ… Welcome, Admin! Redirecting to dashboard...');
        setTimeout(() => this.router.navigate(['/admin']), 500);
      } else {
        this.error.set('Invalid admin credentials. Please try again.');
        this.toast.error('âŒ Invalid admin credentials');
      }
      this.loading.set(false);
    }, 800);
  }
}
