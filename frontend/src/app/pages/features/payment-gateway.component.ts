import { Component, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../shared/toast.service';

declare var Razorpay: any;

@Component({
  selector: 'app-payment-gateway',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="payment-card">
      <h3>💳 Make Payment</h3>

      <div class="loan-info" *ngIf="loanId">
        <div class="info-row"><span>Loan ID</span><strong>#{{ loanId }}</strong></div>
        <div class="info-row"><span>EMI Amount</span><strong style="color:#2563eb">₹{{ emiAmount | number:'1.0-0' }}/month</strong></div>
        <div class="info-row"><span>Due Date</span><strong>{{ dueDate }}</strong></div>
      </div>

      <!-- Payment Amount -->
      <div class="field">
        <label>Payment Amount (₹)</label>
        <input type="number" [(ngModel)]="payAmount"
          [placeholder]="'EMI: ₹' + emiAmount"
          style="width:100%;border:1.5px solid #d1d5db;border-radius:0.5rem;padding:0.6rem 0.875rem;font-size:0.875rem;outline:none;box-sizing:border-box">
      </div>

      <!-- Payment Mode -->
      <div class="mode-grid">
        <div *ngFor="let mode of paymentModes"
             (click)="selectedMode = mode.value"
             class="mode-card"
             [class.selected]="selectedMode === mode.value">
          <div class="mode-icon">{{ mode.icon }}</div>
          <div class="mode-name">{{ mode.label }}</div>
        </div>
      </div>

      <!-- Pay Button -->
      <button (click)="pay()" class="btn-pay" [disabled]="loading() || !payAmount">
        {{ loading() ? 'Processing...' : '💸 Pay ₹' + (payAmount | number:'1.0-0') }}
      </button>

      <!-- Razorpay Button (for real integration) -->
      <button (click)="payWithRazorpay()" class="btn-razorpay" [disabled]="loading() || !payAmount">
        <img src="https://razorpay.com/favicon.ico" width="16" height="16" alt="R">
        Pay with Razorpay
      </button>

      <!-- Payment Success -->
      <div *ngIf="paymentSuccess()" class="success-box">
        <div style="font-size:2rem">✅</div>
        <div class="success-title">Payment Successful!</div>
        <div class="success-detail">Amount: ₹{{ lastPayment()?.amount | number }}</div>
        <div class="success-detail">Txn ID: {{ lastPayment()?.transactionId }}</div>
        <div class="success-detail">Mode: {{ lastPayment()?.paymentMode }}</div>
      </div>
    </div>
  `,
  styles: [`
    .payment-card { background:white; border:1px solid #e5e7eb; border-radius:0.75rem; padding:1.5rem; }
    h3 { font-size:1rem; font-weight:600; color:#111827; margin-bottom:1rem; }
    .loan-info { background:#f8fafc; border-radius:0.5rem; padding:0.875rem; margin-bottom:1rem; }
    .info-row { display:flex; justify-content:space-between; padding:0.3rem 0; font-size:0.85rem; color:#374151; }
    .field { margin-bottom:1rem; }
    label { display:block; font-size:0.825rem; font-weight:600; color:#374151; margin-bottom:0.35rem; }
    .mode-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:0.5rem; margin-bottom:1rem; }
    .mode-card { border:2px solid #e5e7eb; border-radius:0.5rem; padding:0.625rem 0.25rem; text-align:center; cursor:pointer; transition:all 0.15s; }
    .mode-card:hover { border-color:#93c5fd; background:#eff6ff; }
    .mode-card.selected { border-color:#2563eb; background:#eff6ff; }
    .mode-icon { font-size:1.25rem; margin-bottom:0.2rem; }
    .mode-name { font-size:0.65rem; font-weight:600; color:#374151; }
    .btn-pay { width:100%; background:#2563eb; color:white; border:none; border-radius:0.5rem; padding:0.75rem; font-size:0.9rem; font-weight:600; cursor:pointer; margin-bottom:0.5rem; }
    .btn-pay:hover { background:#1d4ed8; }
    .btn-pay:disabled { opacity:0.5; cursor:not-allowed; }
    .btn-razorpay { width:100%; background:#072654; color:white; border:none; border-radius:0.5rem; padding:0.75rem; font-size:0.875rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem; }
    .btn-razorpay:hover { background:#0a3875; }
    .btn-razorpay:disabled { opacity:0.5; }
    .success-box { background:#f0fdf4; border:1px solid #86efac; border-radius:0.75rem; padding:1.5rem; text-align:center; margin-top:1rem; }
    .success-title { font-size:1.1rem; font-weight:700; color:#166534; margin:0.5rem 0; }
    .success-detail { font-size:0.82rem; color:#15803d; margin-top:0.25rem; }
  `]
})
export class PaymentGatewayComponent implements OnInit {
  @Input() loanId!: number;
  @Input() emiAmount: number = 0;
  @Input() dueDate: string = '';

  paymentModes = [
    { label: 'UPI',     value: 'UPI',    icon: '📱' },
    { label: 'NEFT',    value: 'NEFT',   icon: '🏦' },
    { label: 'IMPS',    value: 'IMPS',   icon: '⚡' },
    { label: 'Card',    value: 'CARD',   icon: '💳' },
  ];

  selectedMode = 'UPI';
  payAmount    = 0;
  loading      = signal(false);
  paymentSuccess = signal(false);
  lastPayment    = signal<any>(null);

  constructor(
    private paymentService: PaymentService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.payAmount = this.emiAmount;
  }

  pay() {
    if (!this.payAmount) { this.toast.warning('Enter payment amount'); return; }
    this.loading.set(true);
    this.paymentService.makePayment(this.loanId, this.payAmount, this.selectedMode).subscribe({
      next: (res: any) => {
        this.lastPayment.set(res);
        this.paymentSuccess.set(true);
        this.toast.success(`✅ Payment of ₹${this.payAmount} successful! Txn: ${res.transactionId}`);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  payWithRazorpay() {
    if (!this.payAmount) { this.toast.warning('Enter payment amount'); return; }
    this.loading.set(true);

    // Create Razorpay order
    this.paymentService.createOrder(this.loanId, this.payAmount).subscribe({
      next: (order: any) => {
        const options = {
          key: 'rzp_test_YOUR_KEY_HERE', // Replace with actual Razorpay key
          amount: this.payAmount * 100,  // Razorpay expects paise
          currency: 'INR',
          name: 'CreditPlatform',
          description: `EMI Payment - Loan #${this.loanId}`,
          order_id: order.id,
          handler: (response: any) => {
            // Verify payment
            this.paymentService.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              loanId: this.loanId,
              amount: this.payAmount
            }).subscribe({
              next: (res: any) => {
                this.lastPayment.set(res);
                this.paymentSuccess.set(true);
                this.toast.success(`✅ Razorpay payment verified! Txn: ${response.razorpay_payment_id}`);
                this.loading.set(false);
              },
              error: () => this.loading.set(false)
            });
          },
          prefill: { name: 'Customer', email: 'customer@example.com' },
          theme: { color: '#2563eb' }
        };

        if (typeof Razorpay !== 'undefined') {
          const rzp = new Razorpay(options);
          rzp.open();
        } else {
          this.toast.error('Razorpay SDK not loaded. Use direct payment instead.');
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false)
    });
  }
}
