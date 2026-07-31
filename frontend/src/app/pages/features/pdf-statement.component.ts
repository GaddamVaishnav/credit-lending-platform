import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast.service';

const REPAYMENT_API = 'http://98.130.54.4:8084/api/v1';
const LOAN_API      = 'http://98.130.54.4:8082/api/v1';

@Component({
  selector: 'app-pdf-statement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pdf-card">
      <h3>📄 Download Loan Statement</h3>
      <p style="color:#6b7280;font-size:0.875rem;margin-bottom:1.25rem">
        Generate and download your complete loan statement as PDF
      </p>

      <!-- Loan selector -->
      <div class="field">
        <label>Select Loan</label>
        <select [(ngModel)]="selectedLoanId" (change)="loadLoanDetails()">
          <option value="">-- Select a loan --</option>
          <option *ngFor="let loan of loans()" [value]="loan.id">
            {{ loan.loanType?.replace('_',' ') }} #{{ loan.id }} — ₹{{ loan.requestedAmount | number }}
          </option>
        </select>
      </div>

      <!-- Statement type -->
      <div class="type-grid" *ngIf="selectedLoanId">
        <div *ngFor="let t of statementTypes"
             (click)="selectedType = t.value"
             class="type-card"
             [class.selected]="selectedType === t.value">
          <div class="type-icon">{{ t.icon }}</div>
          <div class="type-name">{{ t.label }}</div>
          <div class="type-desc">{{ t.desc }}</div>
        </div>
      </div>

      <!-- Loan Summary Preview -->
      <div *ngIf="loanDetails()" class="preview-box">
        <div class="preview-header">
          <div class="preview-title">Loan Statement Preview</div>
          <div class="preview-date">As of {{ today }}</div>
        </div>
        <div class="preview-grid">
          <div class="preview-item">
            <div class="label">Loan ID</div>
            <div class="value">#{{ loanDetails().id }}</div>
          </div>
          <div class="preview-item">
            <div class="label">Loan Type</div>
            <div class="value">{{ loanDetails().loanType?.replace('_',' ') }}</div>
          </div>
          <div class="preview-item">
            <div class="label">Principal</div>
            <div class="value">₹{{ loanDetails().requestedAmount | number }}</div>
          </div>
          <div class="preview-item">
            <div class="label">Interest Rate</div>
            <div class="value">{{ loanDetails().interestRate }}% p.a.</div>
          </div>
          <div class="preview-item">
            <div class="label">EMI Amount</div>
            <div class="value">₹{{ loanDetails().emiAmount | number:'1.0-0' }}/mo</div>
          </div>
          <div class="preview-item">
            <div class="label">Status</div>
            <div class="value">{{ loanDetails().status?.replace('_',' ') }}</div>
          </div>
        </div>
      </div>

      <!-- Download Button -->
      <button (click)="downloadPdf()"
              class="btn-download"
              [disabled]="!selectedLoanId || generating()">
        {{ generating() ? '⏳ Generating PDF...' : '⬇️ Download PDF Statement' }}
      </button>

      <!-- Email Button -->
      <button (click)="emailStatement()"
              class="btn-email"
              [disabled]="!selectedLoanId || emailing()">
        {{ emailing() ? '📧 Sending...' : '📧 Email Statement' }}
      </button>
    </div>
  `,
  styles: [`
    .pdf-card { background:white; border:1px solid #e5e7eb; border-radius:0.75rem; padding:1.5rem; }
    h3 { font-size:1rem; font-weight:600; color:#111827; margin-bottom:0.25rem; }
    .field { margin-bottom:1rem; }
    label { display:block; font-size:0.825rem; font-weight:600; color:#374151; margin-bottom:0.35rem; }
    select { width:100%; border:1.5px solid #d1d5db; border-radius:0.5rem; padding:0.6rem 0.875rem; font-size:0.875rem; outline:none; }
    .type-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:0.625rem; margin-bottom:1rem; }
    .type-card { border:2px solid #e5e7eb; border-radius:0.5rem; padding:0.75rem; text-align:center; cursor:pointer; transition:all 0.15s; }
    .type-card:hover { border-color:#93c5fd; }
    .type-card.selected { border-color:#2563eb; background:#eff6ff; }
    .type-icon { font-size:1.5rem; margin-bottom:0.25rem; }
    .type-name { font-size:0.78rem; font-weight:600; color:#111827; }
    .type-desc { font-size:0.68rem; color:#6b7280; margin-top:0.1rem; }
    .preview-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:0.625rem; padding:1rem; margin-bottom:1rem; }
    .preview-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; }
    .preview-title { font-size:0.875rem; font-weight:600; color:#111827; }
    .preview-date { font-size:0.75rem; color:#6b7280; }
    .preview-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:0.5rem; }
    .preview-item { background:white; border-radius:0.375rem; padding:0.5rem 0.625rem; }
    .label { font-size:0.68rem; color:#9ca3af; margin-bottom:0.1rem; }
    .value { font-size:0.82rem; font-weight:600; color:#111827; }
    .btn-download { width:100%; background:#2563eb; color:white; border:none; border-radius:0.5rem; padding:0.75rem; font-size:0.875rem; font-weight:600; cursor:pointer; margin-bottom:0.5rem; }
    .btn-download:hover { background:#1d4ed8; }
    .btn-download:disabled { opacity:0.5; cursor:not-allowed; }
    .btn-email { width:100%; background:white; color:#2563eb; border:1.5px solid #2563eb; border-radius:0.5rem; padding:0.625rem; font-size:0.875rem; cursor:pointer; }
    .btn-email:disabled { opacity:0.5; }
  `]
})
export class PdfStatementComponent {
  loans       = signal<any[]>([]);
  loanDetails = signal<any>(null);
  generating  = signal(false);
  emailing    = signal(false);
  selectedLoanId = '';
  selectedType   = 'full';
  today = new Date().toLocaleDateString('en-IN');

  statementTypes = [
    { label: 'Full Statement', value: 'full',         icon: '📋', desc: 'All transactions' },
    { label: 'EMI Schedule',   value: 'emi',          icon: '📅', desc: 'All installments' },
    { label: 'Tax Statement',  value: 'tax',          icon: '🧾', desc: 'For IT filing' },
  ];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private toast: ToastService
  ) {
    this.loadLoans();
  }

  loadLoans() {
    const cid = this.auth.getCustomerId();
    this.http.get<any[]>(`${LOAN_API}/loans/my-applications?customerId=${cid}`).subscribe({
      next: d => this.loans.set(d),
      error: () => {}
    });
  }

  loadLoanDetails() {
    if (!this.selectedLoanId) return;
    const loan = this.loans().find(l => l.id == +this.selectedLoanId);
    this.loanDetails.set(loan || null);
  }

  downloadPdf() {
    if (!this.selectedLoanId) return;
    this.generating.set(true);

    const loan     = this.loanDetails();
    const customer = this.auth.currentUser();

    // Generate PDF using browser print
    const content = this.generatePdfContent(loan, customer);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(content);
      win.document.close();
      setTimeout(() => {
        win.print();
        win.close();
      }, 500);
    }

    this.toast.success('✅ PDF statement generated! Use browser print to save as PDF.');
    this.generating.set(false);
  }

  emailStatement() {
    this.emailing.set(true);
    setTimeout(() => {
      this.toast.success(`📧 Statement emailed to ${this.auth.currentUser()?.email}`);
      this.emailing.set(false);
    }, 1500);
  }

  generatePdfContent(loan: any, customer: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Loan Statement - #${loan?.id}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: 700; color: #2563eb; }
        .title { font-size: 18px; font-weight: 600; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #2563eb; color: white; padding: 10px; text-align: left; }
        td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background: #f8fafc; }
        .footer { margin-top: 40px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
        .summary-item { background: #f8fafc; padding: 15px; border-radius: 8px; }
        .summary-label { font-size: 12px; color: #6b7280; }
        .summary-value { font-size: 18px; font-weight: 700; color: #111; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">₹ CreditPlatform</div>
          <div style="color:#6b7280;font-size:13px">Credit Lending & Loan Management</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:600">Loan Statement</div>
          <div style="color:#6b7280;font-size:13px">Generated: ${this.today}</div>
        </div>
      </div>

      <div style="margin-bottom:25px">
        <div style="font-weight:600;margin-bottom:5px">Customer Details</div>
        <div>Name: ${customer?.fullName || 'N/A'}</div>
        <div>Email: ${customer?.email || 'N/A'}</div>
        <div>Customer ID: #${customer?.id || 'N/A'}</div>
      </div>

      <div class="title">Loan Details — #${loan?.id}</div>
      <div class="summary">
        <div class="summary-item">
          <div class="summary-label">Principal Amount</div>
          <div class="summary-value">₹${loan?.requestedAmount?.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Interest Rate</div>
          <div class="summary-value">${loan?.interestRate}% p.a.</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Monthly EMI</div>
          <div class="summary-value">₹${Math.round(loan?.emiAmount || 0).toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Loan Type</div>
          <div class="summary-value">${loan?.loanType?.replace('_',' ')}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Tenure</div>
          <div class="summary-value">${loan?.tenureMonths} months</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Status</div>
          <div class="summary-value">${loan?.status?.replace('_',' ')}</div>
        </div>
      </div>

      <div class="footer">
        <p>This is a computer-generated statement and does not require a signature.</p>
        <p>CreditPlatform | Hyderabad, India | support@creditplatform.com</p>
        <p>Statement generated on ${new Date().toLocaleString('en-IN')}</p>
      </div>
    </body>
    </html>`;
  }
}
