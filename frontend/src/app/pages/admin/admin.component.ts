import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../shared/toast.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';

const LOAN_API    = 'http://localhost:8082/api/v1';
const ONBOARD_API = 'http://localhost:8081/api/v1';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="app">
      <!-- Navbar -->
      <nav class="navbar">
        <a routerLink="/dashboard" class="nav-brand" style="text-decoration:none">
          <div class="logo">₹</div>
          <span class="brand">CreditPlatform</span>
          <span class="admin-badge">ADMIN</span>
        </a>
        <div class="nav-right">
          <button (click)="activeTab.set('dashboard')" class="nav-link" [class.active]="activeTab()==='dashboard'">📊 Dashboard</button>
          <button (click)="activeTab.set('loans')"     class="nav-link" [class.active]="activeTab()==='loans'">💳 Loans</button>
          <button (click)="activeTab.set('customers')" class="nav-link" [class.active]="activeTab()==='customers'">👥 Customers</button>
          <button (click)="logout()" class="btn-logout">Logout</button>
        </div>
      </nav>

      <div class="main">

        <!-- ===== DASHBOARD TAB ===== -->
        <div *ngIf="activeTab()==='dashboard'">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
            <h2 class="page-title" style="margin:0">Admin Dashboard</h2>
            <button (click)="loadAll()" class="btn-refresh">🔄 Refresh All</button>
          </div>

          <!-- Stats grid -->
          <div class="stats-grid">
            <div class="stat-card" style="border-color:#3b82f6">
              <div class="stat-icon">👥</div>
              <div>
                <div class="stat-num">{{ customerStats().totalCustomers }}</div>
                <div class="stat-label">Total Customers</div>
              </div>
            </div>
            <div class="stat-card" style="border-color:#10b981">
              <div class="stat-icon">✅</div>
              <div>
                <div class="stat-num">{{ customerStats().eligibleCustomers }}</div>
                <div class="stat-label">Eligible Customers</div>
              </div>
            </div>
            <div class="stat-card" style="border-color:#f59e0b">
              <div class="stat-icon">⏳</div>
              <div>
                <div class="stat-num">{{ loanStats().pendingLoans }}</div>
                <div class="stat-label">Pending Approvals</div>
              </div>
            </div>
            <div class="stat-card" style="border-color:#10b981">
              <div class="stat-icon">💳</div>
              <div>
                <div class="stat-num">{{ loanStats().approvedLoans }}</div>
                <div class="stat-label">Approved Loans</div>
              </div>
            </div>
            <div class="stat-card" style="border-color:#ef4444">
              <div class="stat-icon">❌</div>
              <div>
                <div class="stat-num">{{ loanStats().rejectedLoans }}</div>
                <div class="stat-label">Rejected Loans</div>
              </div>
            </div>
            <div class="stat-card" style="border-color:#8b5cf6">
              <div class="stat-icon">💰</div>
              <div>
                <div class="stat-num">₹{{ (loanStats().totalDisbursed || 0) | number:'1.0-0' }}</div>
                <div class="stat-label">Total Disbursed</div>
              </div>
            </div>
          </div>

          <!-- Pending approvals -->
          <div class="section-card">
            <div class="section-hdr">
              <h3>⚡ Pending Approvals ({{ pendingLoans().length }})</h3>
              <button (click)="activeTab.set('loans')" class="link-btn">View all loans →</button>
            </div>
            <div *ngIf="pendingLoans().length === 0" class="empty">
              🎉 No pending approvals — all caught up!
            </div>
            <table *ngIf="pendingLoans().length > 0">
              <thead>
                <tr>
                  <th>Loan ID</th><th>Customer</th><th>Type</th>
                  <th>Amount</th><th>Tenure</th><th>Status</th><th>Applied</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let loan of pendingLoans()">
                  <td><strong>#{{ loan.id }}</strong></td>
                  <td>
                    <div>{{ getCustomerName(loan.customerId) }}</div>
                    <div style="font-size:0.72rem;color:#9ca3af">ID: {{ loan.customerId }}</div>
                  </td>
                  <td>{{ loan.loanType?.replace('_',' ') }}</td>
                  <td><strong>₹{{ loan.requestedAmount | number }}</strong></td>
                  <td>{{ loan.tenureMonths }}mo</td>
                  <td><span class="badge" [style.background]="loanBg(loan.status)" [style.color]="loanColor(loan.status)">{{ loan.status?.replace('_',' ') }}</span></td>
                  <td>{{ loan.appliedAt | date:'dd MMM yy' }}</td>
                  <td>
                    <button (click)="approveLoan(loan)" class="btn-approve">✅ Approve</button>
                    <button (click)="openReject(loan)"  class="btn-reject">❌ Reject</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ===== LOANS TAB ===== -->
        <div *ngIf="activeTab()==='loans'">
          <div class="section-hdr" style="margin-bottom:1.25rem">
            <h2 class="page-title" style="margin:0">All Loan Applications</h2>
            <div style="display:flex;gap:0.5rem;align-items:center">
              <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="filterLoans()"
                placeholder="🔍 Search by customer ID..."
                style="border:1px solid #e2e8f0;border-radius:0.375rem;padding:0.375rem 0.75rem;font-size:0.8rem;outline:none">
              <select [(ngModel)]="filterStatus" (ngModelChange)="filterLoans()" class="filter-sel">
                <option value="">All Status</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="AGREEMENT_PENDING">Agreement Pending</option>
                <option value="AGREEMENT_SIGNED">Agreement Signed</option>
                <option value="DISBURSED">Disbursed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <button (click)="loadAll()" class="btn-refresh">🔄</button>
            </div>
          </div>

          <div *ngIf="loading()" class="loading">Loading all loan applications...</div>

          <div class="section-card">
            <div style="font-size:0.8rem;color:#64748b;margin-bottom:0.75rem">
              Showing {{ filteredLoans().length }} of {{ allLoans().length }} applications
            </div>
            <div style="overflow-x:auto">
              <table *ngIf="filteredLoans().length > 0">
                <thead>
                  <tr>
                    <th>ID</th><th>Customer</th><th>Loan Type</th>
                    <th>Requested</th><th>Approved</th><th>EMI</th>
                    <th>Rate</th><th>Status</th><th>Applied</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let loan of filteredLoans()">
                    <td><strong>#{{ loan.id }}</strong></td>
                    <td>
                      <div style="font-weight:500">{{ getCustomerName(loan.customerId) }}</div>
                      <div style="font-size:0.72rem;color:#9ca3af">Customer #{{ loan.customerId }}</div>
                    </td>
                    <td>{{ loan.loanType?.replace('_',' ') }}</td>
                    <td>₹{{ loan.requestedAmount | number }}</td>
                    <td>{{ loan.approvedAmount ? ('₹' + (loan.approvedAmount | number)) : '—' }}</td>
                    <td>{{ loan.emiAmount ? ('₹' + (loan.emiAmount | number:'1.0-0') + '/mo') : '—' }}</td>
                    <td>{{ loan.interestRate ? (loan.interestRate + '%') : '—' }}</td>
                    <td>
                      <span class="badge" [style.background]="loanBg(loan.status)" [style.color]="loanColor(loan.status)">
                        {{ loan.status?.replace('_',' ') }}
                      </span>
                    </td>
                    <td>{{ loan.appliedAt | date:'dd MMM yy' }}</td>
                    <td>
                      <div style="display:flex;gap:0.25rem;flex-wrap:wrap">
                        <button *ngIf="canApprove(loan.status)" (click)="approveLoan(loan)" class="btn-approve">✅</button>
                        <button *ngIf="canReject(loan.status)"  (click)="openReject(loan)"  class="btn-reject">❌</button>
                        <button *ngIf="loan.status==='APPROVED'" (click)="setAgreementPending(loan)" class="btn-action" title="Move to Agreement">📋</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div *ngIf="filteredLoans().length === 0" class="empty">No loans found matching your filter</div>
            </div>
          </div>
        </div>

        <!-- ===== CUSTOMERS TAB ===== -->
        <div *ngIf="activeTab()==='customers'">
          <div class="section-hdr" style="margin-bottom:1.25rem">
            <h2 class="page-title" style="margin:0">All Customers ({{ customers().length }})</h2>
            <div style="display:flex;gap:0.5rem">
              <input type="text" [(ngModel)]="customerSearch"
                placeholder="🔍 Search by name or email..."
                style="border:1px solid #e2e8f0;border-radius:0.375rem;padding:0.375rem 0.75rem;font-size:0.8rem;outline:none">
              <button (click)="loadAll()" class="btn-refresh">🔄</button>
            </div>
          </div>

          <div class="section-card">
            <div style="overflow-x:auto">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Name</th><th>Email</th><th>Mobile</th>
                    <th>Income</th><th>Employment</th><th>Credit Score</th>
                    <th>Status</th><th>Joined</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let c of filteredCustomers()">
                    <td>#{{ c.id }}</td>
                    <td><strong>{{ c.fullName }}</strong></td>
                    <td>{{ c.email }}</td>
                    <td>{{ c.mobile }}</td>
                    <td>₹{{ c.monthlyIncome | number }}</td>
                    <td>{{ c.employmentType }}</td>
                    <td>
                      <strong [style.color]="scoreColor(c.creditScore)">
                        {{ c.creditScore || '—' }}
                      </strong>
                      <span *ngIf="c.creditScore" style="font-size:0.7rem;margin-left:0.25rem" [style.color]="scoreColor(c.creditScore)">
                        {{ scoreLabel(c.creditScore) }}
                      </span>
                    </td>
                    <td>
                      <span class="badge" [style.background]="custBg(c.status)" [style.color]="custColor(c.status)">
                        {{ c.status?.replace('_',' ') }}
                      </span>
                    </td>
                    <td>{{ c.createdAt | date:'dd MMM yy' }}</td>
                    <td>
                      <div style="display:flex;gap:0.25rem;flex-wrap:wrap">
                        <button *ngIf="c.status !== 'ELIGIBLE'" (click)="makeEligible(c)" class="btn-approve" title="Make Eligible">✅ Eligible</button>
                        <button *ngIf="c.status === 'ELIGIBLE'" disabled class="btn-approve" style="opacity:0.4">✓ Eligible</button>
                        <button (click)="openScoreModal(c)" class="btn-action" title="Update Credit Score">📊 Score</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div *ngIf="filteredCustomers().length === 0" class="empty">No customers found</div>
            </div>
          </div>
        </div>

      </div>

      <!-- ===== REJECT MODAL ===== -->
      <div *ngIf="rejectModal()" class="modal-overlay" (click)="rejectModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 style="margin-bottom:0.5rem">❌ Reject Loan Application</h3>
          <div class="modal-info">
            <span>Loan #{{ selectedLoan()?.id }}</span>
            <span>{{ getCustomerName(selectedLoan()?.customerId) }}</span>
            <span>₹{{ selectedLoan()?.requestedAmount | number }}</span>
          </div>
          <div class="field">
            <label>Rejection reason *</label>
            <select [(ngModel)]="rejectReason" style="width:100%;border:1.5px solid #d1d5db;border-radius:0.5rem;padding:0.6rem 0.75rem;font-size:0.875rem;outline:none">
              <option value="">Select reason</option>
              <option value="Low credit score — below minimum threshold of 650">Low credit score</option>
              <option value="High FOIR — debt obligations exceed 50% of income">High FOIR ratio</option>
              <option value="Insufficient monthly income for requested amount">Insufficient income</option>
              <option value="Incomplete or invalid KYC documentation">Incomplete documentation</option>
              <option value="Existing loan default or NPA history">Existing loan default</option>
              <option value="Employment verification failed">Employment verification failed</option>
              <option value="Requested amount exceeds eligibility limit">Exceeds eligibility limit</option>
            </select>
          </div>
          <div class="field">
            <label>Additional notes (optional)</label>
            <textarea [(ngModel)]="rejectNotes" rows="3" placeholder="Any additional details..."
              style="width:100%;border:1.5px solid #d1d5db;border-radius:0.5rem;padding:0.625rem;font-size:0.875rem;outline:none;resize:none;box-sizing:border-box"></textarea>
          </div>
          <div style="display:flex;gap:0.75rem">
            <button (click)="confirmReject()" class="btn-reject-modal" [disabled]="!rejectReason || rejecting()">
              {{ rejecting() ? 'Rejecting...' : '❌ Confirm Rejection' }}
            </button>
            <button (click)="rejectModal.set(false)" class="btn-cancel">Cancel</button>
          </div>
        </div>
      </div>

      <!-- ===== CREDIT SCORE MODAL ===== -->
      <div *ngIf="scoreModal()" class="modal-overlay" (click)="scoreModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>📊 Update Credit Score</h3>
          <p style="color:#6b7280;font-size:0.875rem;margin-bottom:1rem">
            Customer: <strong>{{ selectedCustomer()?.fullName }}</strong> |
            Current score: <strong>{{ selectedCustomer()?.creditScore || 'Not set' }}</strong>
          </p>
          <div class="field">
            <label>New credit score (300–900)</label>
            <input type="number" [(ngModel)]="newScore" min="300" max="900"
              placeholder="e.g. 750"
              style="width:100%;border:1.5px solid #d1d5db;border-radius:0.5rem;padding:0.6rem 0.75rem;font-size:0.875rem;outline:none;box-sizing:border-box">
            <div style="font-size:0.75rem;margin-top:0.375rem;color:#6b7280">
              300–549: Poor | 550–649: Fair | 650–749: Good | 750+: Excellent
            </div>
          </div>
          <div style="display:flex;gap:0.75rem">
            <button (click)="updateScore()" class="btn-approve" style="flex:1;padding:0.75rem;font-size:0.875rem" [disabled]="!newScore">
              Update Score
            </button>
            <button (click)="scoreModal.set(false)" class="btn-cancel" style="flex:1">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    * { box-sizing:border-box; margin:0; padding:0; }
    .app { min-height:100vh; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .navbar { background:#1e293b; padding:0 1.5rem; height:60px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; }
    .nav-brand { display:flex; align-items:center; gap:0.625rem; }
    .logo { width:34px; height:34px; background:#3b82f6; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-weight:700; }
    .brand { font-weight:700; font-size:1.1rem; color:white; }
    .admin-badge { background:#f59e0b; color:#1e293b; font-size:0.65rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:9999px; }
    .nav-right { display:flex; align-items:center; gap:0.375rem; }
    .nav-link { color:#94a3b8; font-size:0.8rem; padding:0.375rem 0.625rem; border-radius:0.375rem; cursor:pointer; background:none; border:none; }
    .nav-link:hover,.nav-link.active { color:white; background:#334155; }
    .btn-logout { background:#ef4444; color:white; border:none; border-radius:0.375rem; padding:0.375rem 0.75rem; font-size:0.8rem; cursor:pointer; }
    .main { max-width:1300px; margin:0 auto; padding:1.5rem; }
    .page-title { font-size:1.5rem; font-weight:700; color:#0f172a; }
    .section-hdr { display:flex; justify-content:space-between; align-items:center; }
    .link-btn { color:#3b82f6; font-size:0.875rem; background:none; border:none; cursor:pointer; font-weight:500; }
    .btn-refresh { background:#f1f5f9; border:1px solid #e2e8f0; color:#374151; border-radius:0.375rem; padding:0.375rem 0.75rem; font-size:0.8rem; cursor:pointer; }
    .filter-sel { border:1px solid #e2e8f0; border-radius:0.375rem; padding:0.375rem 0.75rem; font-size:0.8rem; outline:none; }
    .stats-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:0.875rem; margin-bottom:1.25rem; }
    .stat-card { background:white; border-radius:0.75rem; padding:1rem; display:flex; align-items:center; gap:0.75rem; border-left:4px solid; box-shadow:0 1px 3px rgba(0,0,0,.05); }
    .stat-icon { font-size:1.5rem; }
    .stat-num { font-size:1.4rem; font-weight:700; color:#0f172a; }
    .stat-label { font-size:0.7rem; color:#64748b; margin-top:0.1rem; }
    .section-card { background:white; border:1px solid #e2e8f0; border-radius:0.75rem; padding:1.25rem; margin-bottom:1.25rem; }
    h3 { font-size:1rem; font-weight:600; color:#0f172a; }
    table { width:100%; border-collapse:collapse; font-size:0.82rem; min-width:900px; }
    th { background:#f8fafc; padding:0.625rem 0.75rem; text-align:left; color:#64748b; font-weight:500; border-bottom:1px solid #e2e8f0; white-space:nowrap; }
    td { padding:0.75rem 0.75rem; border-bottom:1px solid #f1f5f9; color:#334155; }
    tr:last-child td { border-bottom:none; }
    tr:hover td { background:#f8fafc; }
    .badge { display:inline-block; font-size:0.68rem; font-weight:500; padding:0.2rem 0.6rem; border-radius:9999px; white-space:nowrap; }
    .btn-approve { background:#dcfce7; color:#166534; border:none; border-radius:0.375rem; padding:0.25rem 0.625rem; font-size:0.72rem; cursor:pointer; font-weight:500; white-space:nowrap; }
    .btn-approve:hover { background:#bbf7d0; }
    .btn-approve:disabled { opacity:0.4; cursor:not-allowed; }
    .btn-reject { background:#fee2e2; color:#991b1b; border:none; border-radius:0.375rem; padding:0.25rem 0.625rem; font-size:0.72rem; cursor:pointer; font-weight:500; }
    .btn-reject:hover { background:#fecaca; }
    .btn-action { background:#dbeafe; color:#1e40af; border:none; border-radius:0.375rem; padding:0.25rem 0.625rem; font-size:0.72rem; cursor:pointer; white-space:nowrap; }
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; padding:1rem; }
    .modal { background:white; border-radius:1rem; padding:1.75rem; width:100%; max-width:480px; box-shadow:0 20px 60px rgba(0,0,0,.2); }
    .modal h3 { font-size:1.1rem; font-weight:700; color:#0f172a; margin-bottom:0.75rem; }
    .modal-info { display:flex; gap:1rem; background:#f8fafc; border-radius:0.5rem; padding:0.75rem; margin-bottom:1rem; font-size:0.82rem; color:#374151; }
    .field { margin-bottom:1rem; }
    label { display:block; font-size:0.825rem; font-weight:600; color:#374151; margin-bottom:0.35rem; }
    .btn-reject-modal { flex:1; background:#ef4444; color:white; border:none; border-radius:0.5rem; padding:0.75rem; font-size:0.875rem; font-weight:600; cursor:pointer; }
    .btn-reject-modal:disabled { opacity:0.5; cursor:not-allowed; }
    .btn-cancel { flex:1; background:white; color:#374151; border:1.5px solid #d1d5db; border-radius:0.5rem; padding:0.75rem; font-size:0.875rem; cursor:pointer; }
    .empty { text-align:center; padding:2.5rem; color:#94a3b8; font-size:0.875rem; }
    .loading { text-align:center; padding:1.5rem; color:#64748b; }
    @media (max-width:1024px) { .stats-grid { grid-template-columns:repeat(3,1fr); } }
    @media (max-width:640px)  { .stats-grid { grid-template-columns:repeat(2,1fr); } }
  `]
})
export class AdminComponent implements OnInit {
  activeTab     = signal<'dashboard'|'loans'|'customers'>('dashboard');
  allLoans      = signal<any[]>([]);
  filteredLoans = signal<any[]>([]);
  pendingLoans  = signal<any[]>([]);
  customers     = signal<any[]>([]);
  customerMap   = signal<Map<number,string>>(new Map());
  loanStats     = signal<any>({ pendingLoans:0, approvedLoans:0, rejectedLoans:0, totalDisbursed:0, totalLoans:0 });
  customerStats = signal<any>({ totalCustomers:0, eligibleCustomers:0, pendingKyc:0, avgCreditScore:0 });
  loading       = signal(false);

  // Modals
  rejectModal     = signal(false);
  scoreModal      = signal(false);
  selectedLoan    = signal<any>(null);
  selectedCustomer = signal<any>(null);
  rejectReason    = '';
  rejectNotes     = '';
  rejecting       = signal(false);
  newScore        = 0;

  // Filters
  filterStatus  = '';
  searchTerm    = '';
  customerSearch = '';

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);
    forkJoin({
      loans:         this.http.get<any[]>(`${LOAN_API}/loans/all`),
      loanStats:     this.http.get<any>(`${LOAN_API}/loans/admin/stats`),
      customers:     this.http.get<any[]>(`${ONBOARD_API}/admin/customers`),
      customerStats: this.http.get<any>(`${ONBOARD_API}/admin/stats`)
    }).subscribe({
      next: (data) => {
        // Build customer name map
        const map = new Map<number,string>();
        data.customers.forEach((c: any) => map.set(c.id, c.fullName));
        this.customerMap.set(map);

        this.allLoans.set(data.loans);
        this.filteredLoans.set(data.loans);
        this.pendingLoans.set(data.loans.filter((l: any) =>
          ['SUBMITTED','UNDER_REVIEW'].includes(l.status)));
        this.loanStats.set(data.loanStats);
        this.customers.set(data.customers);
        this.customerStats.set(data.customerStats);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        // Fallback individual loads
        this.loadLoansFallback();
        this.loadCustomersFallback();
      }
    });
  }

  loadLoansFallback() {
    this.http.get<any[]>(`${LOAN_API}/loans/my-applications?customerId=1`).subscribe({
      next: loans => {
        this.allLoans.set(loans);
        this.filteredLoans.set(loans);
        this.pendingLoans.set(loans.filter((l: any) => ['SUBMITTED','UNDER_REVIEW'].includes(l.status)));
      }
    });
  }

  loadCustomersFallback() {
    this.http.get<any>(`${ONBOARD_API}/customers/1/profile`).subscribe({
      next: c => {
        this.customers.set([c]);
        const map = new Map<number,string>();
        map.set(c.id, c.fullName);
        this.customerMap.set(map);
      }
    });
  }

  getCustomerName(id: number): string {
    return this.customerMap().get(id) || `Customer #${id}`;
  }

  filterLoans() {
    let loans = this.allLoans();
    if (this.filterStatus) loans = loans.filter(l => l.status === this.filterStatus);
    if (this.searchTerm)   loans = loans.filter(l => String(l.customerId).includes(this.searchTerm));
    this.filteredLoans.set(loans);
  }

  filteredCustomers(): any[] {
    if (!this.customerSearch) return this.customers();
    const q = this.customerSearch.toLowerCase();
    return this.customers().filter(c =>
      c.fullName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.mobile?.includes(q)
    );
  }

  approveLoan(loan: any) {
    this.http.post(`${LOAN_API}/loans/admin/${loan.id}/approve`, {}).subscribe({
      next: (res: any) => {
        this.toast.success(`✅ Loan #${loan.id} approved for ${this.getCustomerName(loan.customerId)}! EMI: ₹${res.emiAmount?.toFixed(0) || ''}/mo`);
        this.loadAll();
      },
      error: () => {}
    });
  }

  setAgreementPending(loan: any) {
    this.http.post(`${LOAN_API}/loans/admin/${loan.id}/agreement-pending`, {}).subscribe({
      next: () => { this.toast.info(`Loan #${loan.id} moved to AGREEMENT_PENDING`); this.loadAll(); },
      error: () => {}
    });
  }

  openReject(loan: any) {
    this.selectedLoan.set(loan);
    this.rejectReason = '';
    this.rejectNotes  = '';
    this.rejectModal.set(true);
  }

  confirmReject() {
    if (!this.rejectReason) return;
    this.rejecting.set(true);
    const reason = this.rejectNotes
      ? `${this.rejectReason}. ${this.rejectNotes}`
      : this.rejectReason;
    this.http.post(`${LOAN_API}/loans/admin/${this.selectedLoan()?.id}/reject`, { reason }).subscribe({
      next: () => {
        this.toast.warning(`Loan #${this.selectedLoan()?.id} rejected — ${this.rejectReason}`);
        this.rejectModal.set(false);
        this.rejecting.set(false);
        this.loadAll();
      },
      error: () => this.rejecting.set(false)
    });
  }

  makeEligible(customer: any) {
    this.http.post(`${ONBOARD_API}/admin/customers/${customer.id}/make-eligible`, {}).subscribe({
      next: (res: any) => {
        this.toast.success(`✅ ${customer.fullName} is now ELIGIBLE`);
        this.loadAll();
      },
      error: () => {}
    });
  }

  openScoreModal(customer: any) {
    this.selectedCustomer.set(customer);
    this.newScore = customer.creditScore || 700;
    this.scoreModal.set(true);
  }

  updateScore() {
    if (!this.newScore) return;
    this.http.post(`${ONBOARD_API}/admin/customers/${this.selectedCustomer()?.id}/credit-score`,
      { score: this.newScore }).subscribe({
      next: () => {
        this.toast.success(`Credit score updated to ${this.newScore} for ${this.selectedCustomer()?.fullName}`);
        this.scoreModal.set(false);
        this.loadAll();
      },
      error: () => {}
    });
  }

  canApprove(s: string) { return ['SUBMITTED','UNDER_REVIEW'].includes(s); }
  canReject(s: string)  { return ['SUBMITTED','UNDER_REVIEW','APPROVED'].includes(s); }

  scoreColor(s: number) { return !s ? '#374151' : s>=750 ? '#16a34a' : s>=650 ? '#d97706' : '#dc2626'; }
  scoreLabel(s: number) { return s>=750 ? 'Excellent' : s>=650 ? 'Good' : s>=550 ? 'Fair' : 'Poor'; }

  loanBg(s: string)    { const m: any={APPROVED:'#dcfce7',DISBURSED:'#dbeafe',REJECTED:'#fee2e2',UNDER_REVIEW:'#fef9c3',SUBMITTED:'#f3f4f6',AGREEMENT_PENDING:'#fef9c3',AGREEMENT_SIGNED:'#f3e8ff',CANCELLED:'#fee2e2'}; return m[s]||'#f3f4f6'; }
  loanColor(s: string) { const m: any={APPROVED:'#166534',DISBURSED:'#1e40af',REJECTED:'#991b1b',UNDER_REVIEW:'#854d0e',SUBMITTED:'#374151',AGREEMENT_PENDING:'#854d0e',AGREEMENT_SIGNED:'#6b21a8',CANCELLED:'#991b1b'}; return m[s]||'#374151'; }
  custBg(s: string)    { const m: any={ELIGIBLE:'#dcfce7',KYC_VERIFIED:'#dbeafe',REGISTERED:'#f3f4f6',KYC_PENDING:'#fef9c3',DOCS_PENDING:'#fef9c3',REJECTED:'#fee2e2'}; return m[s]||'#f3f4f6'; }
  custColor(s: string) { const m: any={ELIGIBLE:'#166534',KYC_VERIFIED:'#1e40af',REGISTERED:'#374151',KYC_PENDING:'#854d0e',DOCS_PENDING:'#854d0e',REJECTED:'#991b1b'}; return m[s]||'#374151'; }

  logout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("isAdmin");
    this.router.navigate(["/admin-login"]);
  }
}
