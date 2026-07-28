import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoanService } from '../../services/loan.service';
import { CustomerService } from '../../services/customer.service';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="app">
      <nav class="navbar">
        <div class="nav-brand">
          <div class="logo">₹</div>
          <span class="brand">CreditPlatform</span>
        </div>
        <div class="nav-right">
          <a routerLink="/dashboard" class="nav-link active">Dashboard</a>
          <a routerLink="/loans"     class="nav-link">Apply Loan</a>
          <a routerLink="/repayment" class="nav-link">Repayments</a>
          <div class="user-chip">{{ auth.currentUser()?.fullName?.split(' ')[0] }}</div>
          <button (click)="auth.logout()" class="btn-logout">Logout</button>
        </div>
      </nav>

      <div class="main">

        <!-- Loading state -->
        <div *ngIf="loading()" class="loading-banner">
          Loading your financial data...
        </div>

        <!-- Welcome banner -->
        <div class="welcome-banner">
          <div>
            <h2>Good day, {{ auth.currentUser()?.fullName?.split(' ')[0] }}! 👋</h2>
            <p>Here's your financial overview</p>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <button (click)="refreshData()" class="btn-refresh" [disabled]="loading()">
              {{ loading() ? 'Refreshing...' : '🔄 Refresh' }}
            </button>
            <a routerLink="/loans" class="btn-apply">+ Apply for loan</a>
          </div>
        </div>

        <!-- Stats row -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon" style="background:#eff6ff">📊</div>
            <div>
              <div class="stat-label">Credit Score</div>
              <div class="stat-value" [style.color]="scoreColor()">
                {{ auth.currentUser()?.creditScore || '—' }}
              </div>
              <div class="stat-sub">{{ scoreLabel() }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#f0fdf4">✅</div>
            <div>
              <div class="stat-label">Account Status</div>
              <div class="stat-value" style="font-size:1rem">
                <span class="status-badge" [class]="statusClass()">
                  {{ auth.currentUser()?.status?.replace('_',' ') }}
                </span>
              </div>
              <div class="stat-sub">Onboarding stage</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fef9c3">💳</div>
            <div>
              <div class="stat-label">Active Loans</div>
              <div class="stat-value">{{ activeLoanCount() }}</div>
              <div class="stat-sub">Disbursed accounts</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fdf2f8">💰</div>
            <div>
              <div class="stat-label">Monthly Income</div>
              <div class="stat-value" style="font-size:1.1rem">
                ₹{{ auth.currentUser()?.monthlyIncome | number }}
              </div>
              <div class="stat-sub">Declared income</div>
            </div>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="section-card">
          <h3>Quick actions</h3>
          <div class="actions-grid">
            <a routerLink="/loans" class="action blue">
              <div class="action-icon">💳</div>
              <div class="action-title">Apply for loan</div>
              <div class="action-sub">Personal, Home, Vehicle</div>
            </a>
            <a routerLink="/repayment" class="action green">
              <div class="action-icon">📅</div>
              <div class="action-title">EMI schedule</div>
              <div class="action-sub">View all installments</div>
            </a>
            <div (click)="fetchScore()" class="action purple" style="cursor:pointer">
              <div class="action-icon">{{ fetchingScore() ? '⏳' : '📈' }}</div>
              <div class="action-title">Credit score</div>
              <div class="action-sub">{{ fetchingScore() ? 'Fetching...' : 'Refresh CIBIL score' }}</div>
            </div>
            <a routerLink="/repayment" class="action orange">
              <div class="action-icon">💸</div>
              <div class="action-title">Make payment</div>
              <div class="action-sub">Pay EMI now</div>
            </a>
          </div>
        </div>

        <!-- Loan applications -->
        <div class="section-card">
          <div class="section-header">
            <h3>Loan applications</h3>
            <a routerLink="/loans" class="link-btn">+ New application</a>
          </div>

          <div *ngIf="loansLoading()" class="empty">Loading loans...</div>

          <div *ngIf="!loansLoading() && loans().length === 0" class="empty">
            <div style="font-size:2.5rem;margin-bottom:0.5rem">📋</div>
            <p>No loan applications yet</p>
            <a routerLink="/loans" class="btn-apply" style="margin-top:0.75rem">Apply for your first loan</a>
          </div>

          <table *ngIf="loans().length > 0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Tenure</th>
                <th>EMI</th>
                <th>Status</th>
                <th>Applied</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let loan of loans()">
                <td>#{{ loan.id }}</td>
                <td>{{ loan.loanType?.replace('_', ' ') }}</td>
                <td>₹{{ loan.requestedAmount | number }}</td>
                <td>{{ loan.tenureMonths }} mo</td>
                <td>{{ loan.emiAmount ? ('₹' + (loan.emiAmount | number:'1.0-0') + '/mo') : '—' }}</td>
                <td><span class="badge" [class]="badgeClass(loan.status)">
                  {{ loan.status?.replace('_',' ') }}
                </span></td>
                <td>{{ loan.appliedAt | date:'dd MMM yyyy' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    .app { min-height: 100vh; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .navbar { background: white; border-bottom: 1px solid #e5e7eb; padding: 0 1.5rem; height: 60px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
    .nav-brand { display: flex; align-items: center; gap: 0.625rem; }
    .logo { width: 34px; height: 34px; background: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; }
    .brand { font-weight: 700; font-size: 1.1rem; color: #111827; }
    .nav-right { display: flex; align-items: center; gap: 0.5rem; }
    .nav-link { text-decoration: none; color: #6b7280; font-size: 0.875rem; padding: 0.375rem 0.75rem; border-radius: 0.375rem; }
    .nav-link:hover, .nav-link.active { color: #2563eb; background: #eff6ff; font-weight: 500; }
    .user-chip { background: #f3f4f6; color: #374151; padding: 0.3rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 500; }
    .btn-logout { background: white; border: 1px solid #e5e7eb; color: #6b7280; border-radius: 0.375rem; padding: 0.375rem 0.75rem; font-size: 0.8rem; cursor: pointer; }
    .btn-refresh { background: #f3f4f6; border: 1px solid #e5e7eb; color: #374151; border-radius: 0.5rem; padding: 0.5rem 1rem; font-size: 0.8rem; cursor: pointer; }
    .btn-refresh:disabled { opacity: 0.5; }
    .loading-banner { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 0.75rem 1.5rem; text-align: center; font-size: 0.875rem; }
    .main { max-width: 1000px; margin: 0 auto; padding: 1.5rem; }
    .welcome-banner { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .welcome-banner h2 { font-size: 1.5rem; font-weight: 700; color: #111827; }
    .welcome-banner p { color: #6b7280; font-size: 0.875rem; }
    .btn-apply { background: #2563eb; color: white; padding: 0.625rem 1.25rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 500; text-decoration: none; display: inline-block; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.25rem; }
    .stat-card { background: white; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.125rem; display: flex; gap: 0.875rem; align-items: flex-start; }
    .stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; }
    .stat-label { font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-bottom: 0.2rem; }
    .stat-value { font-size: 1.4rem; font-weight: 700; color: #111827; }
    .stat-sub { font-size: 0.7rem; color: #9ca3af; margin-top: 0.2rem; }
    .status-badge { font-size: 0.8rem; padding: 0.2rem 0.6rem; border-radius: 9999px; font-weight: 500; }
    .section-card { background: white; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.25rem; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    h3 { font-size: 1rem; font-weight: 600; color: #111827; margin-bottom: 1rem; }
    .link-btn { color: #2563eb; font-size: 0.875rem; text-decoration: none; font-weight: 500; }
    .actions-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.875rem; }
    .action { border-radius: 0.75rem; padding: 1rem 0.875rem; text-decoration: none; display: block; }
    .action.blue { background: #eff6ff; }
    .action.green { background: #f0fdf4; }
    .action.purple { background: #f5f3ff; }
    .action.orange { background: #fff7ed; }
    .action-icon { font-size: 1.5rem; margin-bottom: 0.375rem; }
    .action-title { font-size: 0.875rem; font-weight: 600; color: #111827; }
    .action-sub { font-size: 0.75rem; color: #6b7280; margin-top: 0.125rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { background: #f9fafb; padding: 0.625rem 0.875rem; text-align: left; color: #6b7280; font-weight: 500; border-bottom: 1px solid #e5e7eb; }
    td { padding: 0.75rem 0.875rem; border-bottom: 1px solid #f3f4f6; color: #374151; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; font-size: 0.72rem; font-weight: 500; padding: 0.2rem 0.6rem; border-radius: 9999px; }
    .b-green { background: #dcfce7; color: #166534; }
    .b-blue  { background: #dbeafe; color: #1e40af; }
    .b-yellow{ background: #fef9c3; color: #854d0e; }
    .b-red   { background: #fee2e2; color: #991b1b; }
    .b-gray  { background: #f3f4f6; color: #374151; }
    .b-purple{ background: #f3e8ff; color: #6b21a8; }
    .empty { text-align: center; padding: 2.5rem; color: #6b7280; }
    @media (max-width: 768px) { .stats-grid, .actions-grid { grid-template-columns: repeat(2,1fr); } .welcome-banner { flex-direction: column; align-items: flex-start; gap: 0.75rem; } }
  `]
})
export class DashboardComponent implements OnInit {
  loans        = signal<any[]>([]);
  loading      = signal(false);
  loansLoading = signal(true);
  fetchingScore = signal(false);

  constructor(
    public auth: AuthService,
    private loanService: LoanService,
    private customerService: CustomerService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    // Always fetch fresh profile on dashboard load
    this.refreshData();
  }

  refreshData() {
    this.loading.set(true);
    const customerId = this.auth.getCustomerId();

    // Use CustomerService to get fresh profile
    this.customerService.getProfile(customerId).subscribe({
      next: profile => {
        const merged = { ...this.auth.currentUser(), ...profile };
        localStorage.setItem('user', JSON.stringify(merged));
        this.auth.currentUser.set(merged);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    // Refresh loan applications
    this.loansLoading.set(true);
    this.loanService.getMyApplications().subscribe({
      next: d => { this.loans.set(d); this.loansLoading.set(false); },
      error: () => this.loansLoading.set(false)
    });
  }

  activeLoanCount() { return this.loans().filter(l => l.status === 'DISBURSED').length; }

  fetchScore() {
    this.fetchingScore.set(true);
    // Use CustomerService to fetch credit score
    this.customerService.fetchCreditScore().subscribe({
      next: () => {
        this.fetchingScore.set(false);
        this.toast.info('Credit score refreshing... Please wait');
        setTimeout(() => this.refreshData(), 3000);
      },
      error: () => this.fetchingScore.set(false)
    });
  }

  scoreColor() {
    const s = this.auth.currentUser()?.creditScore;
    if (!s) return '#111827';
    return s >= 750 ? '#16a34a' : s >= 650 ? '#d97706' : '#dc2626';
  }

  scoreLabel() {
    const s = this.auth.currentUser()?.creditScore;
    if (!s) return 'Not fetched yet';
    return s >= 750 ? 'Excellent' : s >= 650 ? 'Good' : 'Poor';
  }

  statusClass() {
    const m: any = {
      ELIGIBLE:     'status-badge b-green',
      KYC_VERIFIED: 'status-badge b-blue',
      REGISTERED:   'status-badge b-gray',
      KYC_PENDING:  'status-badge b-yellow',
      DOCS_PENDING: 'status-badge b-yellow',
      REJECTED:     'status-badge b-red'
    };
    return m[this.auth.currentUser()?.status] || 'status-badge b-gray';
  }

  badgeClass(s: string) {
    const m: any = {
      APPROVED:          'badge b-green',
      DISBURSED:         'badge b-blue',
      REJECTED:          'badge b-red',
      UNDER_REVIEW:      'badge b-yellow',
      SUBMITTED:         'badge b-gray',
      AGREEMENT_PENDING: 'badge b-yellow',
      AGREEMENT_SIGNED:  'badge b-purple',
      CANCELLED:         'badge b-red'
    };
    return m[s] || 'badge b-gray';
  }
}
