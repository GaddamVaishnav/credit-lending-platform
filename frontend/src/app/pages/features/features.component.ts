import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PaymentGatewayComponent } from './payment-gateway.component';
import { PdfStatementComponent } from './pdf-statement.component';
import { DashboardChartsComponent} from "./dashboard-charts.component";
import {CustomerService} from "../../services/customer.service";

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PaymentGatewayComponent,
    PdfStatementComponent,
    DashboardChartsComponent
  ],
  template: `
    <div class="app">
      <nav class="navbar">
        <a routerLink="/dashboard" class="nav-brand" style="text-decoration:none">
          <div class="logo">₹</div>
          <span class="brand">CreditPlatform</span>
        </a>
        <div class="nav-right">
          <a routerLink="/dashboard"  class="nav-link">Dashboard</a>
          <a routerLink="/loans"      class="nav-link">Apply Loan</a>
          <a routerLink="/repayment"  class="nav-link">Repayments</a>
          <a routerLink="/features"   class="nav-link active">Features</a>
          <button (click)="auth.logout()" class="btn-logout">Logout</button>
        </div>
      </nav>

      <div class="main">
        <h2 class="page-title">Advanced Features</h2>

        <!-- Tab navigation -->
        <div class="tabs">
          <button *ngFor="let tab of tabs"
                  (click)="activeTab.set(tab.value)"
                  class="tab"
                  [class.active]="activeTab() === tab.value">
            {{ tab.icon }} {{ tab.label }}
          </button>
        </div>

        <!-- Tab content -->
        <div class="tab-content">

          <!-- Payment Gateway -->
          <div *ngIf="activeTab() === 'payment'">
            <div class="feature-header">
              <h3>💳 Payment Gateway</h3>
              <p>Make EMI payments via UPI, NEFT, IMPS or Razorpay</p>
            </div>
            <div class="two-col">
              <app-payment-gateway
                [loanId]="1"
                [emiAmount]="23303"
                [dueDate]="'15 Aug 2026'">
              </app-payment-gateway>

              <div class="info-card">
                <h4>💡 Payment Methods</h4>
                <div class="method-list">
                  <div class="method">
                    <span class="method-icon">📱</span>
                    <div>
                      <div class="method-name">UPI</div>
                      <div class="method-desc">Instant payment via any UPI app</div>
                    </div>
                  </div>
                  <div class="method">
                    <span class="method-icon">🏦</span>
                    <div>
                      <div class="method-name">NEFT</div>
                      <div class="method-desc">Bank transfer, 2-4 hours</div>
                    </div>
                  </div>
                  <div class="method">
                    <span class="method-icon">⚡</span>
                    <div>
                      <div class="method-name">IMPS</div>
                      <div class="method-desc">Instant interbank transfer 24/7</div>
                    </div>
                  </div>
                  <div class="method">
                    <span class="method-icon">💳</span>
                    <div>
                      <div class="method-name">Razorpay</div>
                      <div class="method-desc">Cards, wallets, UPI via Razorpay</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Email Notifications -->
          <div *ngIf="activeTab() === 'email'">
            <div class="feature-header">
              <h3>📧 Email Notifications</h3>
              <p>Automated email alerts for all loan activities</p>
            </div>
            <div class="notification-grid">
              <div *ngFor="let notif of notifications" class="notif-card" [class]="notif.type">
                <div class="notif-icon">{{ notif.icon }}</div>
                <div class="notif-content">
                  <div class="notif-title">{{ notif.title }}</div>
                  <div class="notif-desc">{{ notif.desc }}</div>
                  <div class="notif-trigger">Trigger: {{ notif.trigger }}</div>
                </div>
                <div class="notif-status">
                  <span class="status-dot"></span>Active
                </div>
              </div>
            </div>

            <!-- Test notification -->
            <div class="test-box">
              <h4>📨 Test Email Notification</h4>
              <p style="color:#6b7280;font-size:0.875rem;margin-bottom:1rem">
                Email: <strong>{{ auth.currentUser()?.email }}</strong>
              </p>
              <div class="test-buttons">
                <button *ngFor="let btn of testButtons"
                        (click)="sendTest(btn)"
                        class="test-btn"
                        [disabled]="sending()">
                  {{ btn.icon }} {{ btn.label }}
                </button>
              </div>
              <div *ngIf="testResult()" class="test-result">
                ✅ {{ testResult() }}
              </div>
            </div>
          </div>

          <!-- PDF Statement -->
          <div *ngIf="activeTab() === 'pdf'">
            <div class="feature-header">
              <h3>📄 PDF Loan Statement</h3>
              <p>Download your complete loan statement in PDF format</p>
            </div>
            <div class="two-col">
              <app-pdf-statement></app-pdf-statement>
              <div class="info-card">
                <h4>📋 Statement Types</h4>
                <div class="stmt-list">
                  <div class="stmt-item">
                    <div class="stmt-icon">📋</div>
                    <div>
                      <div class="stmt-name">Full Statement</div>
                      <div class="stmt-desc">Complete loan history with all transactions</div>
                    </div>
                  </div>
                  <div class="stmt-item">
                    <div class="stmt-icon">📅</div>
                    <div>
                      <div class="stmt-name">EMI Schedule</div>
                      <div class="stmt-desc">Month-wise installment breakdown</div>
                    </div>
                  </div>
                  <div class="stmt-item">
                    <div class="stmt-icon">🧾</div>
                    <div>
                      <div class="stmt-name">Tax Statement</div>
                      <div class="stmt-desc">Interest certificate for IT returns</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Dashboard Charts -->
          <div *ngIf="activeTab() === 'charts'">
            <div class="feature-header">
              <h3>📊 Financial Analytics</h3>
              <p>Visual insights into your loan portfolio and repayment progress</p>
            </div>
            <app-dashboard-charts></app-dashboard-charts>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    .app { min-height:100vh; background:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .navbar { background:white; border-bottom:1px solid #e5e7eb; padding:0 1.5rem; height:60px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; }
    .nav-brand { display:flex; align-items:center; gap:0.625rem; }
    .logo { width:34px; height:34px; background:#2563eb; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-weight:700; }
    .brand { font-weight:700; font-size:1.1rem; color:#111827; }
    .nav-right { display:flex; align-items:center; gap:0.5rem; }
    .nav-link { text-decoration:none; color:#6b7280; font-size:0.875rem; padding:0.375rem 0.75rem; border-radius:0.375rem; }
    .nav-link:hover,.nav-link.active { color:#2563eb; background:#eff6ff; font-weight:500; }
    .btn-logout { background:white; border:1px solid #e5e7eb; color:#6b7280; border-radius:0.375rem; padding:0.375rem 0.75rem; font-size:0.8rem; cursor:pointer; }
    .main { max-width:1100px; margin:0 auto; padding:1.5rem; }
    .page-title { font-size:1.5rem; font-weight:700; color:#111827; margin-bottom:1.25rem; }

    /* Tabs */
    .tabs { display:flex; gap:0.5rem; margin-bottom:1.5rem; border-bottom:2px solid #e5e7eb; padding-bottom:0; }
    .tab { background:none; border:none; padding:0.75rem 1.25rem; font-size:0.875rem; color:#6b7280; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; font-weight:500; }
    .tab:hover { color:#2563eb; }
    .tab.active { color:#2563eb; border-bottom-color:#2563eb; font-weight:600; }

    /* Feature header */
    .feature-header { margin-bottom:1.5rem; }
    .feature-header h3 { font-size:1.25rem; font-weight:700; color:#111827; margin-bottom:0.25rem; }
    .feature-header p { color:#6b7280; font-size:0.875rem; }

    /* Two column */
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; }

    /* Info card */
    .info-card { background:white; border:1px solid #e5e7eb; border-radius:0.75rem; padding:1.5rem; }
    .info-card h4 { font-size:0.9rem; font-weight:600; color:#111827; margin-bottom:1rem; }

    /* Payment methods */
    .method-list { display:flex; flex-direction:column; gap:0.75rem; }
    .method { display:flex; align-items:center; gap:0.875rem; padding:0.75rem; background:#f8fafc; border-radius:0.5rem; }
    .method-icon { font-size:1.5rem; }
    .method-name { font-size:0.875rem; font-weight:600; color:#111827; }
    .method-desc { font-size:0.75rem; color:#6b7280; margin-top:0.1rem; }

    /* Notification grid */
    .notification-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; margin-bottom:1.5rem; }
    .notif-card { background:white; border:1px solid #e5e7eb; border-radius:0.75rem; padding:1.25rem; display:flex; gap:0.875rem; align-items:flex-start; }
    .notif-icon { font-size:1.75rem; flex-shrink:0; }
    .notif-title { font-size:0.875rem; font-weight:600; color:#111827; }
    .notif-desc { font-size:0.78rem; color:#6b7280; margin:0.2rem 0; }
    .notif-trigger { font-size:0.72rem; color:#9ca3af; }
    .notif-status { margin-left:auto; font-size:0.72rem; color:#16a34a; display:flex; align-items:center; gap:0.25rem; white-space:nowrap; }
    .status-dot { width:6px; height:6px; background:#16a34a; border-radius:50%; }

    /* Test box */
    .test-box { background:white; border:1px solid #e5e7eb; border-radius:0.75rem; padding:1.5rem; }
    .test-box h4 { font-size:0.9rem; font-weight:600; color:#111827; margin-bottom:0.5rem; }
    .test-buttons { display:flex; flex-wrap:wrap; gap:0.5rem; }
    .test-btn { background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; border-radius:0.5rem; padding:0.5rem 0.875rem; font-size:0.8rem; cursor:pointer; }
    .test-btn:hover { background:#dbeafe; }
    .test-btn:disabled { opacity:0.5; }
    .test-result { margin-top:0.75rem; color:#16a34a; font-size:0.875rem; }

    /* Statement list */
    .stmt-list { display:flex; flex-direction:column; gap:0.75rem; }
    .stmt-item { display:flex; align-items:center; gap:0.875rem; padding:0.75rem; background:#f8fafc; border-radius:0.5rem; }
    .stmt-icon { font-size:1.5rem; }
    .stmt-name { font-size:0.875rem; font-weight:600; color:#111827; }
    .stmt-desc { font-size:0.75rem; color:#6b7280; }

    @media (max-width:768px) { .two-col,.notification-grid { grid-template-columns:1fr; } .tabs { flex-wrap:wrap; } }
  `]
})
export class FeaturesComponent {
  activeTab = signal('payment');
  sending   = signal(false);
  testResult = signal('');

  tabs = [
    { label: 'Payment Gateway',      value: 'payment', icon: '💳' },
    { label: 'Email Notifications',  value: 'email',   icon: '📧' },
    { label: 'PDF Statement',        value: 'pdf',     icon: '📄' },
    { label: 'Analytics',            value: 'charts',  icon: '📊' },
  ];

  notifications = [
    { icon:'🎉', title:'Loan Approved',     desc:'Sent when loan is approved by underwriter', trigger:'Loan status → APPROVED',         type:'success-notif' },
    { icon:'💰', title:'Disbursement Alert', desc:'Funds credited to your bank account',       trigger:'Disbursement → COMPLETED',       type:'info-notif'    },
    { icon:'📅', title:'EMI Reminder',       desc:'3 days before EMI due date',                trigger:'3 days before due date',          type:'warn-notif'    },
    { icon:'✅', title:'Payment Confirmed',  desc:'Payment receipt for every EMI paid',        trigger:'Payment → SUCCESSFUL',           type:'success-notif' },
    { icon:'⚠️', title:'Overdue Alert',      desc:'EMI overdue notification with penalty info',trigger:'EMI not paid by due date',        type:'danger-notif'  },
    { icon:'📋', title:'Statement Ready',    desc:'Monthly statement available for download',  trigger:'1st of every month',              type:'info-notif'    },
  ];

  testButtons = [
    { icon:'🎉', label:'Loan Approved',  type:'approval'  },
    { icon:'📅', label:'EMI Reminder',   type:'reminder'  },
    { icon:'✅', label:'Payment Receipt',type:'payment'   },
    { icon:'📋', label:'Monthly Report', type:'report'    },
  ];
  private toast: any;

  constructor(public auth: AuthService, private customerService: CustomerService ) {}

  sendTest(btn: any) {
    this.sending.set(true);
    this.testResult.set('');
    setTimeout(() => {
      this.testResult.set(`${btn.icon} ${btn.label} email sent to ${this.auth.currentUser()?.email || 'your email'}`);
      this.sending.set(false);
    }, 1500);
  }

  // KYC status check
  checkKyc() {
    this.customerService.getKycStatus(
        this.auth.getCustomerId()
    ).subscribe({
      next: (status: any) => this.toast.info(`KYC Status: ${status}`),
      error: () => {}
    });
  }
}
