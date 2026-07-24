import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoanService } from '../../services/loan.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'app-repayment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="app">
      <nav class="navbar">
        <a routerLink="/dashboard" class="nav-brand" style="text-decoration:none">
            <div class="logo">₹</div><span class="brand">CreditPlatform</span>
        </a>
        <div class="nav-right">
          <a routerLink="/dashboard" class="nav-link">Dashboard</a>
          <a routerLink="/loans"     class="nav-link">Apply Loan</a>
          <a routerLink="/repayment" class="nav-link active">Repayments</a>
          <button (click)="auth.logout()" class="btn-logout">Logout</button>
        </div>
      </nav>

      <div class="main">
        <h2 class="page-title">Repayments & EMI</h2>

        <!-- Loan selector -->
        <div class="card mb">
          <label>Select loan account</label>
          <select [(ngModel)]="selectedLoanId" (ngModelChange)="onLoanSelect()">
            <option value="">-- Select a loan --</option>
            <option *ngFor="let l of loans()" [value]="l.id">
              {{ l.loanType?.replace('_',' ') }} #{{ l.id }} — ₹{{ l.requestedAmount | number }} ({{ l.status }})
            </option>
          </select>
        </div>

        <div *ngIf="!selectedLoanId && loans().length === 0" class="empty">
          <div style="font-size:3rem;margin-bottom:0.5rem">📋</div>
          <p>No loan applications found</p>
          <a routerLink="/loans" class="btn-primary" style="display:inline-block;margin-top:0.75rem;text-decoration:none">Apply for a loan</a>
        </div>

        <div *ngIf="selectedLoanId" class="grid">
          <!-- EMI Schedule -->
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
              <h3>EMI Schedule</h3>
              <div style="display:flex;gap:0.75rem;font-size:0.75rem;color:#6b7280">
                <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16a34a;margin-right:4px"></span>Paid</span>
                <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#d97706;margin-right:4px"></span>Due</span>
                <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#dc2626;margin-right:4px"></span>Overdue</span>
              </div>
            </div>
            <div *ngIf="loadingEmi()" style="text-align:center;padding:2rem;color:#6b7280">Loading schedule...</div>
            <div *ngIf="!loadingEmi() && schedule().length === 0" style="text-align:center;padding:2rem;color:#6b7280">
              No EMI schedule found. Loan may not be disbursed yet.
            </div>
            <div style="overflow-x:auto" *ngIf="schedule().length > 0">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Due Date</th><th>EMI</th>
                    <th>Principal</th><th>Interest</th><th>Balance</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let e of schedule()"
                      [style.background]="e.status==='PAID'?'#f9fafb':e.status==='OVERDUE'?'#fff1f2':e.status==='DUE'?'#fefce8':''">
                    <td>{{ e.installmentNumber }}</td>
                    <td>{{ e.dueDate }}</td>
                    <td><strong>₹{{ e.emiAmount | number:'1.0-0' }}</strong></td>
                    <td>₹{{ e.principalComponent | number:'1.0-0' }}</td>
                    <td>₹{{ e.interestComponent | number:'1.0-0' }}</td>
                    <td>₹{{ e.outstandingPrincipal | number:'1.0-0' }}</td>
                    <td>
                      <span style="font-size:0.68rem;font-weight:500;padding:0.2rem 0.55rem;border-radius:9999px"
                            [style.background]="statusBg(e.status)"
                            [style.color]="statusColor(e.status)">{{ e.status }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Sidebar -->
          <div style="display:flex;flex-direction:column;gap:1rem">

            <!-- Summary -->
            <div class="card" *ngIf="summary()">
              <h3>Loan Summary</h3>
              <div class="srow"><span>Principal</span><strong>₹{{ summary().principalAmount | number }}</strong></div>
              <div class="srow"><span>EMI amount</span><strong>₹{{ summary().emiAmount | number:'1.0-0' }}/mo</strong></div>
              <div class="srow"><span>Outstanding</span><strong style="color:#dc2626">₹{{ summary().outstandingPrincipal | number:'1.0-0' }}</strong></div>
              <div class="srow"><span>EMIs paid</span><strong>{{ summary().emilsPaid }}</strong></div>
              <div class="srow"><span>EMIs remaining</span><strong>{{ summary().emisRemaining }}</strong></div>
            </div>

            <!-- Payment -->
            <div class="card">
              <h3>Make Payment</h3>
              <div class="field">
                <label>Amount (₹)</label>
                <input type="number" [(ngModel)]="payAmount" placeholder="Enter EMI amount">
              </div>
              <div class="field">
                <label>Payment mode</label>
                <select [(ngModel)]="payMode">
                  <option value="UPI">UPI</option>
                  <option value="NEFT">NEFT</option>
                  <option value="IMPS">IMPS</option>
                </select>
              </div>
              <button (click)="makePayment()" class="btn-primary" [disabled]="payLoading() || !payAmount">
                {{ payLoading() ? 'Processing...' : '💸 Pay Now' }}
              </button>
            </div>

            <!-- Foreclosure -->
            <div class="card">
              <h3>Foreclosure Quote</h3>
              <p style="font-size:0.8rem;color:#6b7280;margin-bottom:0.75rem">Close your loan early (2% penalty applies)</p>
              <button (click)="getForeclosure()" class="btn-outline" [disabled]="fcLoading()">
                {{ fcLoading() ? 'Calculating...' : '📋 Get Quote' }}
              </button>
              <div *ngIf="foreclosure()" style="margin-top:0.75rem;border:1px solid #e5e7eb;border-radius:0.5rem;overflow:hidden">
                <div class="fcrow"><span>Outstanding</span><strong>₹{{ foreclosure().outstandingPrincipal | number:'1.0-0' }}</strong></div>
                <div class="fcrow"><span>Penalty (2%)</span><strong>₹{{ foreclosure().foreclosurePenalty | number:'1.0-0' }}</strong></div>
                <div class="fcrow" style="background:#eff6ff;color:#1e40af;font-weight:600"><span>Total payable</span><strong>₹{{ foreclosure().totalPayable | number:'1.0-0' }}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    * { box-sizing:border-box; }
    .app { min-height:100vh; background:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .navbar { background:white; border-bottom:1px solid #e5e7eb; padding:0 1.5rem; height:60px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; }
    .nav-brand { display:flex; align-items:center; gap:0.625rem; }
    .logo { width:34px; height:34px; background:#2563eb; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-weight:700; }
    .brand { font-weight:700; font-size:1.1rem; color:#111827; }
    .nav-right { display:flex; align-items:center; gap:0.5rem; }
    .nav-link { text-decoration:none; color:#6b7280; font-size:0.875rem; padding:0.375rem 0.75rem; border-radius:0.375rem; }
    .nav-link:hover, .nav-link.active { color:#2563eb; background:#eff6ff; font-weight:500; }
    .btn-logout { background:white; border:1px solid #e5e7eb; color:#6b7280; border-radius:0.375rem; padding:0.375rem 0.75rem; font-size:0.8rem; cursor:pointer; }
    .main { max-width:1200px; margin:0 auto; padding:1.5rem; }
    .page-title { font-size:1.5rem; font-weight:700; color:#111827; margin-bottom:1.25rem; }
    .card { background:white; border:1px solid #e5e7eb; border-radius:0.75rem; padding:1.25rem; }
    .mb { margin-bottom:1.25rem; }
    label { display:block; font-size:0.875rem; font-weight:500; color:#374151; margin-bottom:0.375rem; }
    select, input[type=number] { width:100%; border:1.5px solid #d1d5db; border-radius:0.5rem; padding:0.6rem 0.875rem; font-size:0.875rem; outline:none; }
    select:focus, input:focus { border-color:#2563eb; }
    .grid { display:grid; grid-template-columns:2fr 1fr; gap:1.25rem; }
    h3 { font-size:1rem; font-weight:600; color:#111827; margin-bottom:0.875rem; }
    table { width:100%; border-collapse:collapse; font-size:0.82rem; }
    th { background:#f9fafb; padding:0.625rem 0.75rem; text-align:left; color:#6b7280; font-weight:500; border-bottom:1px solid #e5e7eb; white-space:nowrap; }
    td { padding:0.625rem 0.75rem; border-bottom:1px solid #f3f4f6; color:#374151; }
    tr:last-child td { border-bottom:none; }
    .srow { display:flex; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid #f3f4f6; font-size:0.85rem; }
    .srow:last-child { border-bottom:none; }
    .field { margin-bottom:0.875rem; }
    .btn-primary { width:100%; background:#2563eb; color:white; border:none; border-radius:0.5rem; padding:0.75rem; font-size:0.875rem; font-weight:600; cursor:pointer; }
    .btn-primary:hover { background:#1d4ed8; }
    .btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
    .btn-outline { width:100%; background:white; color:#2563eb; border:1.5px solid #2563eb; border-radius:0.5rem; padding:0.625rem; font-size:0.875rem; cursor:pointer; }
    .fcrow { display:flex; justify-content:space-between; padding:0.5rem 0.75rem; font-size:0.85rem; border-bottom:1px solid #f3f4f6; }
    .fcrow:last-child { border-bottom:none; }
    .empty { text-align:center; padding:3rem; color:#6b7280; }
    @media (max-width:768px) { .grid { grid-template-columns:1fr; } }
  `]
})
export class RepaymentComponent implements OnInit {
  loans        = signal<any[]>([]);
  schedule     = signal<any[]>([]);
  summary      = signal<any>(null);
  foreclosure  = signal<any>(null);
  selectedLoanId = '';
  payAmount    = 0;
  payMode      = 'UPI';
  loadingEmi   = signal(false);
  payLoading   = signal(false);
  fcLoading    = signal(false);

  constructor(
    public auth: AuthService,
    private loanService: LoanService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loanService.getMyApplications().subscribe({
      next: d => this.loans.set(d),
      error: () => this.toast.error('Failed to load loan applications')
    });
  }

  onLoanSelect() {
    if (!this.selectedLoanId) return;
    this.foreclosure.set(null);
    this.schedule.set([]);
    this.summary.set(null);
    this.loadingEmi.set(true);

    this.loanService.getEmiSchedule(+this.selectedLoanId).subscribe({
      next: d => { this.schedule.set(d); this.loadingEmi.set(false); },
      error: (e) => {
        const msg = e.error?.error || 'Failed to load EMI schedule';
        this.toast.error(msg);
        this.loadingEmi.set(false);
      }
    });

    this.loanService.getLoanSummary(+this.selectedLoanId).subscribe({
      next: d => this.summary.set(d),
      error: () => {}
    });
  }

  makePayment() {
    if (!this.payAmount) { this.toast.warning('Please enter payment amount'); return; }
    this.payLoading.set(true);
    this.loanService.makePayment({
      loanId: +this.selectedLoanId,
      amount: this.payAmount,
      paymentMode: this.payMode
    }).subscribe({
      next: (res: any) => {
        this.toast.success(`✅ Payment of ₹${this.payAmount} successful! Txn ID: ${res.transactionId}`);
        this.payLoading.set(false);
        this.payAmount = 0;
        this.onLoanSelect();
      },
      error: (e) => {
        const msg = e.error?.error || 'Payment failed. Please try again.';
        this.toast.error(`❌ ${msg}`);
        this.payLoading.set(false);
      }
    });
  }

  getForeclosure() {
    this.fcLoading.set(true);
    this.loanService.getForeclosure(+this.selectedLoanId).subscribe({
      next: d => { this.foreclosure.set(d); this.fcLoading.set(false); this.toast.info('Foreclosure quote generated'); },
      error: (e) => {
        const msg = e.error?.error || 'Failed to get foreclosure quote';
        this.toast.error(msg);
        this.fcLoading.set(false);
      }
    });
  }

  statusBg(s: string)    { const m: any={PAID:'#dcfce7',DUE:'#fef9c3',OVERDUE:'#fee2e2',UPCOMING:'#dbeafe'}; return m[s]||'#f3f4f6'; }
  statusColor(s: string) { const m: any={PAID:'#166534',DUE:'#854d0e',OVERDUE:'#991b1b',UPCOMING:'#1e40af'}; return m[s]||'#374151'; }
}
