import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoanService } from '../../services/loan.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast.service';
import {CustomerService} from "../../services/customer.service";

function loanAmountValidator(min: number, max: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = +control.value;
    if (!val) return null;
    if (val < min) return { amount: `Minimum loan amount is ₹${min.toLocaleString()}` };
    if (val > max) return { amount: `Maximum loan amount is ₹${max.toLocaleString()}` };
    return null;
  };
}

@Component({
  selector: 'app-loan',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="app">
      <nav class="navbar">
        <a routerLink="/dashboard" class="nav-brand" style="text-decoration:none">
          <div class="logo">₹</div><span class="brand">CreditPlatform</span>
        </a>
        <div class="nav-right">
          <a routerLink="/dashboard" class="nav-link">Dashboard</a>
          <a routerLink="/loans"     class="nav-link active">Apply Loan</a>
          <a routerLink="/repayment" class="nav-link">Repayments</a>
          <button (click)="auth.logout()" class="btn-logout">Logout</button>
        </div>
      </nav>

      <div class="main">
        <h2 class="page-title">Apply for a Loan</h2>

        <div class="grid">
          <form [formGroup]="loanForm" (ngSubmit)="apply()" class="form-card">
            <h3>Loan details</h3>

            <!-- Loan type -->
            <div class="field">
              <label>Loan type <span class="req">*</span></label>
              <div class="type-grid">
                <div *ngFor="let t of loanTypes"
                     (click)="selectType(t)"
                     class="type-card"
                     [class.selected]="loanForm.get('loanType')?.value === t.value">
                  <div class="type-icon">{{ t.icon }}</div>
                  <div class="type-name">{{ t.label }}</div>
                  <div class="type-rate">{{ t.rate }}% p.a.</div>
                  <div class="type-range">₹{{ t.min/1000 }}K – ₹{{ t.max/100000 }}L</div>
                </div>
              </div>
            </div>

            <!-- Loan Amount -->
            <div class="field">
              <label>
                Loan amount <span class="req">*</span>
                <strong style="color:#2563eb;float:right">₹{{ loanForm.get('requestedAmount')?.value | number }}</strong>
              </label>
              <input type="range" formControlName="requestedAmount"
                (input)="calcEmi()"
                [min]="currentType().min" [max]="currentType().max" step="10000">
              <div class="range-labels">
                <span>₹{{ currentType().min | number }}</span>
                <span>₹{{ currentType().max | number }}</span>
              </div>
              <div class="error-msg" *ngIf="isInvalid('requestedAmount')">
                <span *ngIf="f['requestedAmount'].errors?.['required']">Loan amount is required</span>
                <span *ngIf="f['requestedAmount'].errors?.['amount']">{{ f['requestedAmount'].errors?.['amount'] }}</span>
              </div>
            </div>

            <!-- Tenure -->
            <div class="field">
              <label>
                Tenure <span class="req">*</span>
                <strong style="color:#2563eb;float:right">{{ loanForm.get('tenureMonths')?.value }} months</strong>
              </label>
              <input type="range" formControlName="tenureMonths"
                (input)="calcEmi()"
                [min]="currentType().minT" [max]="currentType().maxT" step="6">
              <div class="range-labels">
                <span>{{ currentType().minT }} months</span>
                <span>{{ currentType().maxT }} months</span>
              </div>
            </div>

            <div class="row2">
              <!-- Monthly Income -->
              <div class="field">
                <label>Monthly income <span class="req">*</span></label>
                <div class="input-prefix-wrap">
                  <span class="input-prefix">₹</span>
                  <input type="number" formControlName="monthlyIncome"
                    placeholder="e.g. 75000"
                    [class.error-input]="isInvalid('monthlyIncome')">
                </div>
                <div class="field-hint">Your net monthly take-home salary</div>
                <div class="error-msg" *ngIf="isInvalid('monthlyIncome')">
                  <span *ngIf="f['monthlyIncome'].errors?.['required']">Monthly income is required</span>
                  <span *ngIf="f['monthlyIncome'].errors?.['min']">Income must be at least ₹10,000</span>
                </div>
              </div>

              <!-- Existing EMIs -->
              <div class="field">
                <label>Existing EMI obligations</label>
                <div class="input-prefix-wrap">
                  <span class="input-prefix">₹</span>
                  <input type="number" formControlName="existingEmiObligations"
                    placeholder="0 if none"
                    [class.error-input]="isInvalid('existingEmiObligations')">
                </div>
                <div class="field-hint">Total of all current monthly EMIs</div>
                <div class="error-msg" *ngIf="isInvalid('existingEmiObligations')">
                  <span *ngIf="f['existingEmiObligations'].errors?.['min']">Cannot be negative</span>
                </div>
              </div>
            </div>

            <div class="row2">
              <!-- Credit Score -->
              <div class="field">
                <label>Credit (CIBIL) score <span class="req">*</span></label>
                <input type="number" formControlName="creditScore"
                  placeholder="e.g. 750"
                  [class.error-input]="isInvalid('creditScore')">
                <div class="field-hint">Your CIBIL score (300–900)</div>
                <div class="error-msg" *ngIf="isInvalid('creditScore')">
                  <span *ngIf="f['creditScore'].errors?.['required']">Credit score is required</span>
                  <span *ngIf="f['creditScore'].errors?.['min']">Minimum score is 300</span>
                  <span *ngIf="f['creditScore'].errors?.['max']">Maximum score is 900</span>
                </div>
              </div>

              <!-- Employment -->
              <div class="field">
                <label>Employment type <span class="req">*</span></label>
                <select formControlName="employmentType"
                  [class.error-input]="isInvalid('employmentType')">
                  <option value="">Select type</option>
                  <option value="SALARIED">Salaried Employee</option>
                  <option value="SELF_EMPLOYED">Self-employed</option>
                  <option value="BUSINESS">Business Owner</option>
                </select>
                <div class="error-msg" *ngIf="isInvalid('employmentType')">
                  <span>Please select your employment type</span>
                </div>
              </div>
            </div>

            <!-- Loan Purpose -->
            <div class="field">
              <label>Loan purpose</label>
              <input type="text" formControlName="loanPurpose"
                placeholder="e.g. Home renovation, Medical expenses, Education"
                [class.error-input]="isInvalid('loanPurpose')">
              <div class="field-hint">Brief description of why you need this loan</div>
              <div class="error-msg" *ngIf="isInvalid('loanPurpose')">
                <span *ngIf="f['loanPurpose'].errors?.['maxlength']">Purpose cannot exceed 200 characters</span>
              </div>
            </div>

            <!-- FOIR warning -->
            <div *ngIf="foirWarning()" class="foir-warning">
              ⚠️ {{ foirWarning() }}
            </div>

            <button type="submit" class="btn-primary" [disabled]="loading()">
              {{ loading() ? 'Submitting application...' : '📋 Submit Loan Application' }}
            </button>

            <div *ngIf="submitted && loanForm.invalid" class="form-error-summary">
              ⚠️ Please fix the errors above before submitting
            </div>
          </form>

          <!-- Right panel -->
          <div>
            <!-- EMI Preview -->
            <div class="preview-card" style="margin-bottom:1rem">
              <h3>📊 EMI Preview</h3>
              <div *ngIf="emi()" class="emi-box">
                <div class="emi-highlight">
                  <div class="emi-label">Monthly EMI</div>
                  <div class="emi-value">₹{{ emi()!.monthlyEmi | number:'1.0-0' }}</div>
                </div>
                <div class="emi-row"><span>Principal amount</span><span>₹{{ loanForm.get('requestedAmount')?.value | number }}</span></div>
                <div class="emi-row"><span>Interest rate</span><span>{{ currentType().rate }}% p.a.</span></div>
                <div class="emi-row"><span>Loan tenure</span><span>{{ loanForm.get('tenureMonths')?.value }} months</span></div>
                <div class="emi-row"><span>Total interest</span><span>₹{{ emi()!.totalInterest | number:'1.0-0' }}</span></div>
                <div class="emi-row" style="font-weight:600"><span>Total payable</span><span>₹{{ emi()!.totalPayable | number:'1.0-0' }}</span></div>
              </div>

              <!-- FOIR indicator -->
              <div *ngIf="loanForm.get('monthlyIncome')?.value && emi()" class="foir-box">
                <div class="foir-label">
                  FOIR (Fixed Obligation to Income Ratio)
                  <span class="foir-pct" [style.color]="foirColor()">{{ foirPercent() }}%</span>
                </div>
                <div class="foir-bar">
                  <div class="foir-fill" [style.width]="foirPercent()+'%'" [style.background]="foirColor()"></div>
                  <div class="foir-limit" style="left:50%"></div>
                </div>
                <div style="font-size:0.72rem;color:#9ca3af">
                  Max allowed: 50% | Your FOIR: {{ foirPercent() }}%
                  <span [style.color]="foirColor()">{{ foirLabel() }}</span>
                </div>
              </div>
            </div>

            <!-- My Applications -->
            <div class="preview-card">
              <h3>My Applications</h3>
              <div *ngIf="loans().length === 0" style="text-align:center;padding:1.5rem;color:#9ca3af;font-size:0.875rem">
                No applications yet
              </div>
              <div *ngFor="let loan of loans()" class="loan-row">
                <div>
                  <div style="font-weight:500;color:#111827;font-size:0.875rem">
                    {{ loan.loanType?.replace('_',' ') }} #{{ loan.id }}
                  </div>
                  <div style="color:#6b7280;font-size:0.78rem">
                    ₹{{ loan.requestedAmount | number }} · {{ loan.tenureMonths }}mo
                  </div>
                </div>
                <div style="text-align:right">
                  <span style="font-size:0.7rem;font-weight:500;padding:0.2rem 0.55rem;border-radius:9999px"
                        [style.background]="loanBg(loan.status)" [style.color]="loanColor(loan.status)">
                    {{ loan.status?.replace('_',' ') }}
                  </span>
                  <div *ngIf="loan.emiAmount" style="font-size:0.75rem;color:#6b7280;margin-top:0.25rem">
                    EMI ₹{{ loan.emiAmount | number:'1.0-0' }}/mo
                  </div>
                </div>
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
    .nav-brand { display:flex; align-items:center; gap:0.625rem; cursor:pointer; }
    .logo { width:34px; height:34px; background:#2563eb; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-weight:700; }
    .brand { font-weight:700; font-size:1.1rem; color:#111827; }
    .nav-right { display:flex; align-items:center; gap:0.5rem; }
    .nav-link { text-decoration:none; color:#6b7280; font-size:0.875rem; padding:0.375rem 0.75rem; border-radius:0.375rem; }
    .nav-link:hover,.nav-link.active { color:#2563eb; background:#eff6ff; font-weight:500; }
    .btn-logout { background:white; border:1px solid #e5e7eb; color:#6b7280; border-radius:0.375rem; padding:0.375rem 0.75rem; font-size:0.8rem; cursor:pointer; }
    .main { max-width:1100px; margin:0 auto; padding:1.5rem; }
    .page-title { font-size:1.5rem; font-weight:700; color:#111827; margin-bottom:1.25rem; }
    .grid { display:grid; grid-template-columns:1.4fr 1fr; gap:1.25rem; }
    .form-card,.preview-card { background:white; border:1px solid #e5e7eb; border-radius:0.75rem; padding:1.5rem; }
    h3 { font-size:1rem; font-weight:600; color:#111827; margin-bottom:1rem; }
    .req { color:#ef4444; }
    .type-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:0.625rem; margin-bottom:0.5rem; }
    .type-card { border:2px solid #e5e7eb; border-radius:0.625rem; padding:0.75rem 0.5rem; text-align:center; cursor:pointer; transition:all 0.15s; }
    .type-card:hover { border-color:#93c5fd; background:#eff6ff; }
    .type-card.selected { border-color:#2563eb; background:#eff6ff; }
    .type-icon { font-size:1.25rem; margin-bottom:0.2rem; }
    .type-name { font-size:0.72rem; font-weight:600; color:#111827; }
    .type-rate { font-size:0.65rem; color:#2563eb; font-weight:500; }
    .type-range { font-size:0.6rem; color:#9ca3af; margin-top:0.1rem; }
    .field { margin-bottom:1rem; }
    label { display:block; font-size:0.825rem; font-weight:600; color:#374151; margin-bottom:0.35rem; }
    input[type=number],input[type=text],select { width:100%; border:1.5px solid #d1d5db; border-radius:0.5rem; padding:0.55rem 0.75rem; font-size:0.875rem; outline:none; }
    input:focus,select:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.1); }
    input[type=range] { width:100%; accent-color:#2563eb; }
    .error-input { border-color:#ef4444 !important; }
    .error-msg { font-size:0.78rem; color:#dc2626; margin-top:0.3rem; }
    .error-msg::before { content:'⚠ '; }
    .field-hint { font-size:0.72rem; color:#9ca3af; margin-top:0.25rem; }
    .input-prefix-wrap { display:flex; }
    .input-prefix { background:#f3f4f6; border:1.5px solid #d1d5db; border-right:none; border-radius:0.5rem 0 0 0.5rem; padding:0.55rem 0.75rem; font-size:0.875rem; color:#6b7280; }
    .input-prefix-wrap input { border-radius:0 0.5rem 0.5rem 0; }
    .range-labels { display:flex; justify-content:space-between; font-size:0.72rem; color:#9ca3af; margin-top:0.25rem; }
    .row2 { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
    .foir-warning { background:#fef9c3; border:1px solid #fde047; color:#854d0e; border-radius:0.5rem; padding:0.75rem; font-size:0.8rem; margin-bottom:1rem; }
    .btn-primary { width:100%; background:#2563eb; color:white; border:none; border-radius:0.5rem; padding:0.75rem; font-size:0.9rem; font-weight:600; cursor:pointer; }
    .btn-primary:hover { background:#1d4ed8; }
    .btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
    .form-error-summary { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; border-radius:0.5rem; padding:0.75rem; font-size:0.8rem; text-align:center; margin-top:0.5rem; }
    .emi-box { border:1px solid #e5e7eb; border-radius:0.5rem; overflow:hidden; }
    .emi-highlight { background:#eff6ff; padding:1rem; text-align:center; border-bottom:1px solid #bfdbfe; }
    .emi-label { font-size:0.8rem; color:#1e40af; font-weight:500; }
    .emi-value { font-size:2rem; font-weight:700; color:#1e40af; }
    .emi-row { display:flex; justify-content:space-between; padding:0.5rem 0.875rem; font-size:0.82rem; border-bottom:1px solid #f3f4f6; }
    .emi-row:last-child { border-bottom:none; }
    .foir-box { margin-top:0.75rem; padding:0.75rem; background:#f8fafc; border-radius:0.5rem; }
    .foir-label { display:flex; justify-content:space-between; font-size:0.78rem; color:#374151; margin-bottom:0.375rem; font-weight:500; }
    .foir-pct { font-weight:700; }
    .foir-bar { height:8px; background:#e5e7eb; border-radius:9999px; overflow:hidden; position:relative; margin-bottom:0.375rem; }
    .foir-fill { height:100%; border-radius:9999px; transition:all 0.3s; }
    .foir-limit { position:absolute; top:0; bottom:0; width:2px; background:#ef4444; transform:translateX(-50%); }
    .loan-row { display:flex; justify-content:space-between; align-items:center; padding:0.75rem 0; border-bottom:1px solid #f3f4f6; }
    .loan-row:last-child { border-bottom:none; }
    @media (max-width:768px) { .grid { grid-template-columns:1fr; } .type-grid { grid-template-columns:repeat(2,1fr); } }
  `]
})
export class LoanComponent implements OnInit {
  loanTypes = [
    { label:'Personal', value:'PERSONAL_LOAN', icon:'💳', rate:10.5, min:50000,  max:2000000,  minT:12, maxT:60  },
    { label:'Home',     value:'HOME_LOAN',     icon:'🏠', rate:8.5,  min:500000, max:10000000, minT:60, maxT:360 },
    { label:'Vehicle',  value:'VEHICLE_LOAN',  icon:'🚗', rate:9.0,  min:100000, max:5000000,  minT:12, maxT:84  },
    { label:'Education',value:'EDUCATION_LOAN',icon:'🎓', rate:9.5,  min:50000,  max:2000000,  minT:12, maxT:120 },
  ];

  loanForm!: FormGroup;
  emi       = signal<any>(null);
  loans     = signal<any[]>([]);
  loading   = signal(false);
  submitted = false;

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    private loanService: LoanService,
    private toast: ToastService,
    private customerService: CustomerService
  ) {}

  ngOnInit() {
    this.loanForm = this.fb.group({
      loanType:               ['PERSONAL_LOAN'],
      requestedAmount:        [500000, [Validators.required, Validators.min(50000), Validators.max(2000000)]],
      tenureMonths:           [24,     [Validators.required, Validators.min(12), Validators.max(360)]],
      monthlyIncome:          ['',     [Validators.required, Validators.min(10000)]],
      existingEmiObligations: [0,      [Validators.min(0)]],
      creditScore:            ['',     [Validators.required, Validators.min(300), Validators.max(900)]],
      employmentType:         ['',     Validators.required],
      loanPurpose:            ['',     Validators.maxLength(200)]
    });
    this.calcEmi();
    this.loanService.getMyApplications().subscribe({
      next: d => this.loans.set(d), error: () => {}
    });
  }

  get f() { return this.loanForm.controls; }

  isInvalid(field: string): boolean {
    const c = this.f[field];
    return c.invalid && (c.dirty || c.touched || this.submitted);
  }

  currentType() {
    return this.loanTypes.find(t => t.value === this.loanForm.get('loanType')?.value) || this.loanTypes[0];
  }

  selectType(t: any) {
    this.loanForm.patchValue({ loanType: t.value, requestedAmount: t.min * 5, tenureMonths: t.minT + 12 });
    this.calcEmi();
  }

  calcEmi() {
    const v = this.loanForm.value;
    this.loanService.calculateEmi(v.requestedAmount, this.currentType().rate, v.tenureMonths)
      .subscribe({ next: d => this.emi.set(d), error: () => {} });
  }

  foirPercent(): number {
    const income   = +this.loanForm.get('monthlyIncome')?.value || 0;
    const existing = +this.loanForm.get('existingEmiObligations')?.value || 0;
    const emiAmt   = this.emi()?.monthlyEmi || 0;
    if (!income) return 0;
    return Math.round(((existing + emiAmt) / income) * 100);
  }

  foirColor(): string {
    const f = this.foirPercent();
    return f <= 40 ? '#10b981' : f <= 50 ? '#f59e0b' : '#ef4444';
  }

  foirLabel(): string {
    const f = this.foirPercent();
    return f <= 40 ? '✅ Excellent' : f <= 50 ? '⚠️ Acceptable' : '❌ Too high — loan may be rejected';
  }

  foirWarning(): string {
    const f = this.foirPercent();
    if (f > 50) return `Your FOIR is ${f}% which exceeds the maximum limit of 50%. Consider reducing the loan amount or tenure.`;
    return '';
  }

  apply() {
    this.submitted = true;
    if (this.loanForm.invalid) {
      Object.values(this.f).forEach(c => c.markAsTouched());
      this.toast.warning('Please fill all required fields correctly');
      return;
    }
    if (this.foirPercent() > 60) {
      this.toast.error(`❌ FOIR is ${this.foirPercent()}% — too high. Reduce loan amount or existing obligations.`);
      return;
    }

    this.loading.set(true);
    const payload = { ...this.loanForm.value, customerId: this.auth.getCustomerId() };
    this.loanService.applyForLoan(payload).subscribe({
      next: (res: any) => {
        this.toast.success(`✅ Loan #${res.id} submitted! Status: ${res.status}`);
        this.loading.set(false);
        this.loanService.getMyApplications().subscribe(d => this.loans.set(d));
      },
      error: () => this.loading.set(false)
    });
  }

  // Credit score refresh button handler:
  fetchScore() {
    this.customerService.fetchCreditScore().subscribe({
      next: () => {
        this.toast.info('Credit score refreshing...');
        setTimeout(() => {
          this.customerService.getProfile(
              this.auth.getCustomerId()
          ).subscribe({
            next: p => this.auth.currentUser.set({
              ...this.auth.currentUser(), ...p
            }),
            error: () => {}
          });
        }, 3000);
      },
      error: () => {}
    });
  }

  loanBg(s: string)    { const m: any={APPROVED:'#dcfce7',DISBURSED:'#dbeafe',REJECTED:'#fee2e2',UNDER_REVIEW:'#fef9c3',SUBMITTED:'#f3f4f6',AGREEMENT_PENDING:'#fef9c3',AGREEMENT_SIGNED:'#f3e8ff',CANCELLED:'#fee2e2'}; return m[s]||'#f3f4f6'; }
  loanColor(s: string) { const m: any={APPROVED:'#166534',DISBURSED:'#1e40af',REJECTED:'#991b1b',UNDER_REVIEW:'#854d0e',SUBMITTED:'#374151',AGREEMENT_PENDING:'#854d0e',AGREEMENT_SIGNED:'#6b21a8',CANCELLED:'#991b1b'}; return m[s]||'#374151'; }
}
