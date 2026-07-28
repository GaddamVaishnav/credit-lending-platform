import { Component, OnInit, signal, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

const LOAN_API     = '/api/loan/api/v1';
const REPAY_API    = '/api/repayment/api/v1';

@Component({
  selector: 'app-dashboard-charts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="charts-section">
      <h3>📊 Financial Analytics</h3>

      <div class="charts-grid">

        <!-- EMI Payment Progress -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">EMI Payment Progress</div>
            <div class="chart-badge green">{{ paidPercent() }}% Complete</div>
          </div>
          <div class="progress-wrap">
            <div class="progress-bar">
              <div class="progress-fill" [style.width]="paidPercent() + '%'"></div>
            </div>
            <div class="progress-labels">
              <span>{{ emisPaid() }} paid</span>
              <span>{{ emisRemaining() }} remaining</span>
            </div>
          </div>
          <div class="stat-row">
            <div class="stat-item">
              <div class="stat-val green">₹{{ totalPaid() | number:'1.0-0' }}</div>
              <div class="stat-lbl">Total Paid</div>
            </div>
            <div class="stat-item">
              <div class="stat-val blue">₹{{ outstanding() | number:'1.0-0' }}</div>
              <div class="stat-lbl">Outstanding</div>
            </div>
            <div class="stat-item">
              <div class="stat-val orange">₹{{ totalInterest() | number:'1.0-0' }}</div>
              <div class="stat-lbl">Total Interest</div>
            </div>
          </div>
        </div>

        <!-- Loan Breakdown Donut -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">Principal vs Interest Split</div>
          </div>
          <div class="donut-wrap">
            <svg viewBox="0 0 200 200" class="donut-svg">
              <!-- Principal arc -->
              <circle cx="100" cy="100" r="70"
                fill="none" stroke="#e5e7eb" stroke-width="30"/>
              <circle cx="100" cy="100" r="70"
                fill="none" stroke="#2563eb" stroke-width="30"
                [attr.stroke-dasharray]="principalDash() + ' ' + (440 - principalDash())"
                stroke-dashoffset="110"
                style="transition:all 1s ease"/>
              <!-- Interest arc -->
              <circle cx="100" cy="100" r="70"
                fill="none" stroke="#f59e0b" stroke-width="30"
                [attr.stroke-dasharray]="interestDash() + ' ' + (440 - interestDash())"
                [attr.stroke-dashoffset]="110 - principalDash()"
                style="transition:all 1s ease"/>
              <text x="100" y="95" text-anchor="middle" font-size="14" font-weight="700" fill="#111">
                ₹{{ (loanAmount() / 1000) | number:'1.0-0' }}K
              </text>
              <text x="100" y="115" text-anchor="middle" font-size="10" fill="#6b7280">Total Loan</text>
            </svg>
            <div class="donut-legend">
              <div class="legend-item">
                <div class="legend-dot blue-dot"></div>
                <div>
                  <div class="legend-label">Principal</div>
                  <div class="legend-val">₹{{ loanAmount() | number:'1.0-0' }}</div>
                </div>
              </div>
              <div class="legend-item">
                <div class="legend-dot orange-dot"></div>
                <div>
                  <div class="legend-label">Total Interest</div>
                  <div class="legend-val">₹{{ totalInterest() | number:'1.0-0' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Monthly EMI Bar Chart -->
        <div class="chart-card full-width">
          <div class="chart-header">
            <div class="chart-title">EMI Payment Timeline (Last 6 months)</div>
          </div>
          <div class="bar-chart">
            <div *ngFor="let bar of emiBarData()" class="bar-item">
              <div class="bar-label">{{ bar.month }}</div>
              <div class="bar-wrap">
                <div class="bar-fill"
                     [style.height]="bar.height + '%'"
                     [style.background]="bar.paid ? '#2563eb' : '#e5e7eb'"
                     [class.upcoming]="!bar.paid">
                </div>
              </div>
              <div class="bar-amount">₹{{ (bar.amount / 1000) | number:'1.0-0' }}K</div>
              <div class="bar-status" [style.color]="bar.paid ? '#16a34a' : '#9ca3af'">
                {{ bar.paid ? '✅' : '⏳' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Credit Score Gauge -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">Credit Score</div>
          </div>
          <div class="gauge-wrap">
            <svg viewBox="0 0 200 120" class="gauge-svg">
              <!-- Background arc -->
              <path d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none" stroke="#e5e7eb" stroke-width="20" stroke-linecap="round"/>
              <!-- Score arc -->
              <path d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none" [attr.stroke]="scoreColor()"
                stroke-width="20" stroke-linecap="round"
                [attr.stroke-dasharray]="scoreDash() + ' 251'"
                stroke-dashoffset="0"/>
              <!-- Score text -->
              <text x="100" y="90" text-anchor="middle" font-size="28" font-weight="700"
                [attr.fill]="scoreColor()">{{ creditScore() }}</text>
              <text x="100" y="110" text-anchor="middle" font-size="11" fill="#6b7280">
                {{ scoreLabel() }}
              </text>
            </svg>
            <div class="gauge-scale">
              <span style="color:#ef4444">300</span>
              <span style="color:#f59e0b">550</span>
              <span style="color:#10b981">750</span>
              <span style="color:#10b981">900</span>
            </div>
          </div>
        </div>

        <!-- Loan Status Summary -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">Loan Portfolio</div>
          </div>
          <div *ngFor="let loan of loans()" class="loan-bar-item">
            <div class="loan-bar-header">
              <span>{{ loan.loanType?.replace('_',' ') }} #{{ loan.id }}</span>
              <span [style.color]="loanColor(loan.status)">{{ loan.status?.replace('_',' ') }}</span>
            </div>
            <div class="loan-progress-bar">
              <div class="loan-progress-fill"
                   [style.width]="getLoanProgress(loan) + '%'"
                   [style.background]="loanColor(loan.status)">
              </div>
            </div>
            <div class="loan-bar-footer">
              <span>₹{{ loan.requestedAmount | number }}</span>
              <span>{{ loan.tenureMonths }} months</span>
            </div>
          </div>
          <div *ngIf="loans().length === 0" style="text-align:center;color:#9ca3af;padding:1rem">
            No loans yet
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .charts-section { margin-top: 1.25rem; }
    h3 { font-size: 1rem; font-weight: 600; color: #111827; margin-bottom: 1.25rem; }
    .charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .chart-card { background: white; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.25rem; }
    .full-width { grid-column: 1 / -1; }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .chart-title { font-size: 0.875rem; font-weight: 600; color: #111827; }
    .chart-badge { font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 9999px; }
    .green { background: #dcfce7; color: #166534; }

    /* Progress bar */
    .progress-wrap { margin-bottom: 1rem; }
    .progress-bar { height: 10px; background: #e5e7eb; border-radius: 9999px; overflow: hidden; margin-bottom: 0.375rem; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #2563eb, #10b981); border-radius: 9999px; transition: width 1s ease; }
    .progress-labels { display: flex; justify-content: space-between; font-size: 0.72rem; color: #6b7280; }
    .stat-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.5rem; }
    .stat-item { text-align: center; background: #f8fafc; border-radius: 0.5rem; padding: 0.5rem; }
    .stat-val { font-size: 0.9rem; font-weight: 700; }
    .stat-lbl { font-size: 0.65rem; color: #6b7280; margin-top: 0.15rem; }
    .green { color: #16a34a; } .blue { color: #2563eb; } .orange { color: #d97706; }

    /* Donut chart */
    .donut-wrap { display: flex; align-items: center; gap: 1rem; }
    .donut-svg { width: 140px; height: 140px; }
    .donut-legend { flex: 1; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
    .legend-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    .blue-dot { background: #2563eb; } .orange-dot { background: #f59e0b; }
    .legend-label { font-size: 0.72rem; color: #6b7280; }
    .legend-val { font-size: 0.875rem; font-weight: 600; color: #111; }

    /* Bar chart */
    .bar-chart { display: flex; justify-content: space-around; align-items: flex-end; height: 120px; padding: 0 0.5rem; }
    .bar-item { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; flex: 1; }
    .bar-label { font-size: 0.65rem; color: #6b7280; }
    .bar-wrap { flex: 1; display: flex; align-items: flex-end; width: 100%; max-width: 40px; min-height: 60px; }
    .bar-fill { width: 100%; border-radius: 4px 4px 0 0; min-height: 4px; transition: height 1s ease; }
    .upcoming { background: #dbeafe !important; border: 2px dashed #93c5fd; }
    .bar-amount { font-size: 0.65rem; color: #374151; font-weight: 500; }
    .bar-status { font-size: 0.7rem; }

    /* Gauge */
    .gauge-wrap { display: flex; flex-direction: column; align-items: center; }
    .gauge-svg { width: 180px; height: 110px; }
    .gauge-scale { display: flex; justify-content: space-between; width: 160px; font-size: 0.65rem; color: #9ca3af; margin-top: 0.25rem; }

    /* Loan bars */
    .loan-bar-item { margin-bottom: 0.875rem; }
    .loan-bar-header { display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 0.25rem; }
    .loan-progress-bar { height: 6px; background: #e5e7eb; border-radius: 9999px; overflow: hidden; margin-bottom: 0.2rem; }
    .loan-progress-fill { height: 100%; border-radius: 9999px; transition: width 1s ease; }
    .loan-bar-footer { display: flex; justify-content: space-between; font-size: 0.7rem; color: #9ca3af; }

    @media (max-width:768px) { .charts-grid { grid-template-columns: 1fr; } }
  `]
})
export class DashboardChartsComponent implements OnInit {
  loans          = signal<any[]>([]);
  emisPaid       = signal(0);
  emisRemaining  = signal(0);
  totalPaid      = signal(0);
  outstanding    = signal(0);
  totalInterest  = signal(0);
  loanAmount     = signal(0);
  creditScore    = signal(0);
  emiAmount      = signal(0);

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const cid = this.auth.getCustomerId();

    // Load loans
    this.http.get<any[]>(`${LOAN_API}/loans/my-applications?customerId=${cid}`).subscribe({
      next: loans => {
        this.loans.set(loans);
        if (loans.length > 0) {
          const loan = loans[0];
          this.loanAmount.set(loan.requestedAmount || 0);
          this.emiAmount.set(loan.emiAmount || 0);
          // Calculate total interest
          const total = (loan.emiAmount || 0) * (loan.tenureMonths || 0);
          this.totalInterest.set(total - (loan.requestedAmount || 0));

          // Load EMI schedule for first loan
          this.http.get<any[]>(`${REPAY_API}/emi/${loan.id}/schedule?customerId=${cid}`).subscribe({
            next: schedule => {
              const paid      = schedule.filter(e => e.status === 'PAID').length;
              const remaining = schedule.filter(e => e.status !== 'PAID').length;
              this.emisPaid.set(paid);
              this.emisRemaining.set(remaining);
              this.totalPaid.set(paid * (loan.emiAmount || 0));
              this.outstanding.set(remaining * (loan.emiAmount || 0));
            },
            error: () => {}
          });
        }
      },
      error: () => {}
    });

    // Load credit score
    const user = this.auth.currentUser();
    this.creditScore.set(user?.creditScore || 0);
  }

  paidPercent(): number {
    const total = this.emisPaid() + this.emisRemaining();
    return total ? Math.round((this.emisPaid() / total) * 100) : 0;
  }

  principalDash(): number {
    const total = this.loanAmount() + this.totalInterest();
    return total ? Math.round((this.loanAmount() / total) * 440) : 0;
  }

  interestDash(): number {
    const total = this.loanAmount() + this.totalInterest();
    return total ? Math.round((this.totalInterest() / total) * 440) : 0;
  }

  scoreDash(): number {
    const score = this.creditScore();
    return score ? Math.round(((score - 300) / 600) * 251) : 0;
  }

  scoreColor(): string {
    const s = this.creditScore();
    return s >= 750 ? '#10b981' : s >= 650 ? '#f59e0b' : '#ef4444';
  }

  scoreLabel(): string {
    const s = this.creditScore();
    return s >= 750 ? 'Excellent' : s >= 650 ? 'Good' : s >= 550 ? 'Fair' : 'Poor';
  }

  emiBarData(): any[] {
    const months = ['Feb','Mar','Apr','May','Jun','Jul'];
    const emi = this.emiAmount();
    return months.map((month, i) => ({
      month,
      amount: emi || 23000,
      paid:   i < this.emisPaid(),
      height: 60 + Math.random() * 40
    }));
  }

  getLoanProgress(loan: any): number {
    const statusMap: any = {
      SUBMITTED: 10, UNDER_REVIEW: 20, APPROVED: 40,
      AGREEMENT_PENDING: 50, AGREEMENT_SIGNED: 60,
      DISBURSED: 100, REJECTED: 0, CANCELLED: 0
    };
    return statusMap[loan.status] || 0;
  }

  loanColor(status: string): string {
    const m: any = {
      APPROVED: '#16a34a', DISBURSED: '#2563eb',
      REJECTED: '#dc2626', SUBMITTED: '#6b7280',
      AGREEMENT_SIGNED: '#7c3aed'
    };
    return m[status] || '#6b7280';
  }
}
