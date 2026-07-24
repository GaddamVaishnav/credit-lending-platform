import { Component, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  ValidationErrors,
  FormsModule
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast.service';

// Custom validators
function mobileValidator(control: AbstractControl): ValidationErrors | null {
  const val = control.value?.toString();
  if (!val) return null;
  if (!/^[6-9]\d{9}$/.test(val)) return { mobile: 'Must be a valid 10-digit Indian mobile number starting with 6-9' };
  return null;
}

function passwordValidator(control: AbstractControl): ValidationErrors | null {
  const val = control.value;
  if (!val) return null;
  if (val.length < 8)           return { password: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(val))       return { password: 'Password must contain at least one uppercase letter (A-Z)' };
  if (!/[0-9]/.test(val))       return { password: 'Password must contain at least one number (0-9)' };
  if (!/[!@#$%^&*]/.test(val))  return { password: 'Password must contain at least one special character (!@#$%^&*)' };
  return null;
}

function panValidator(control: AbstractControl): ValidationErrors | null {
  const val = control.value?.toUpperCase();
  if (!val) return null;
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val)) return { pan: 'PAN must be in format: ABCDE1234F' };
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  template: `
    <div class="page-bg">
      <div class="card">
        <a routerLink="/" class="logo-wrap" style="text-decoration:none">
          <div class="logo">₹</div>
          <h1>CreditPlatform</h1>
          <p>{{ step() === 1 ? 'Create your account' : 'Verify your mobile' }}</p>
        </a>

        <!-- Step indicators -->
        <div class="steps">
          <div class="step" [class.active]="step()===1" [class.done]="step()>1">
            <div class="step-num">{{ step()>1 ? '✓' : '1' }}</div><span>Register</span>
          </div>
          <div class="step-line"></div>
          <div class="step" [class.active]="step()===2">
            <div class="step-num">2</div><span>Verify OTP</span>
          </div>
        </div>

        <!-- Step 1: Registration form -->
        <form *ngIf="step()===1" [formGroup]="registerForm" (ngSubmit)="register()">

          <div class="row2">
            <!-- Full Name -->
            <div class="field">
              <label>Full name <span class="req">*</span></label>
              <input type="text" formControlName="fullName"
                placeholder="e.g. Rahul Sharma"
                [class.error-input]="isInvalid('fullName')">
              <div class="field-hint">Enter your name as per Aadhaar card</div>
              <div class="error-msg" *ngIf="isInvalid('fullName')">
                <span *ngIf="f['fullName'].errors?.['required']">Full name is required</span>
                <span *ngIf="f['fullName'].errors?.['minlength']">Name must be at least 3 characters</span>
                <span *ngIf="f['fullName'].errors?.['maxlength']">Name cannot exceed 100 characters</span>
                <span *ngIf="f['fullName'].errors?.['pattern']">Name can only contain letters and spaces</span>
              </div>
            </div>

            <!-- Mobile -->
            <div class="field">
              <label>Mobile number <span class="req">*</span></label>
              <div class="input-prefix-wrap">
                <span class="input-prefix">+91</span>
                <input type="tel" formControlName="mobile"
                  placeholder="9876543210" maxlength="10"
                  [class.error-input]="isInvalid('mobile')">
              </div>
              <div class="field-hint">10-digit mobile linked to your Aadhaar</div>
              <div class="error-msg" *ngIf="isInvalid('mobile')">
                <span *ngIf="f['mobile'].errors?.['required']">Mobile number is required</span>
                <span *ngIf="f['mobile'].errors?.['mobile']">{{ f['mobile'].errors?.['mobile'] }}</span>
              </div>
            </div>
          </div>

          <!-- Email -->
          <div class="field">
            <label>Email address <span class="req">*</span></label>
            <input type="email" formControlName="email"
              placeholder="e.g. rahul@example.com"
              [class.error-input]="isInvalid('email')">
            <div class="field-hint">We'll send loan updates to this email</div>
            <div class="error-msg" *ngIf="isInvalid('email')">
              <span *ngIf="f['email'].errors?.['required']">Email address is required</span>
              <span *ngIf="f['email'].errors?.['email']">Enter a valid email address (e.g. name&#64;domain.com)</span>
            </div>
          </div>

          <!-- Password -->
          <div class="field">
            <label>Password <span class="req">*</span></label>
            <div class="input-icon-wrap">
              <input [type]="showPassword ? 'text' : 'password'" formControlName="password"
                placeholder="Min 8 chars with uppercase, number & special char"
                [class.error-input]="isInvalid('password')">
              <button type="button" class="eye-btn" (click)="showPassword=!showPassword">
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
            <!-- Password strength indicator -->
            <div class="strength-bar" *ngIf="f['password'].value">
              <div class="strength-fill" [style.width]="passwordStrength()+'%'" [style.background]="strengthColor()"></div>
            </div>
            <div class="field-hint" [style.color]="strengthColor()" *ngIf="f['password'].value">
              Password strength: {{ strengthLabel() }}
            </div>
            <div class="error-msg" *ngIf="isInvalid('password')">
              <span *ngIf="f['password'].errors?.['required']">Password is required</span>
              <span *ngIf="f['password'].errors?.['password']">{{ f['password'].errors?.['password'] }}</span>
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
              <div class="field-hint">Net monthly take-home salary</div>
              <div class="error-msg" *ngIf="isInvalid('monthlyIncome')">
                <span *ngIf="f['monthlyIncome'].errors?.['required']">Monthly income is required</span>
                <span *ngIf="f['monthlyIncome'].errors?.['min']">Minimum income must be ₹10,000</span>
                <span *ngIf="f['monthlyIncome'].errors?.['max']">Please enter a valid income amount</span>
              </div>
            </div>

            <!-- Employment Type -->
            <div class="field">
              <label>Employment type <span class="req">*</span></label>
              <select formControlName="employmentType"
                [class.error-input]="isInvalid('employmentType')">
                <option value="">-- Select type --</option>
                <option value="SALARIED">Salaried Employee</option>
                <option value="SELF_EMPLOYED">Self-employed</option>
                <option value="BUSINESS">Business Owner</option>
              </select>
              <div class="field-hint">Your current employment category</div>
              <div class="error-msg" *ngIf="isInvalid('employmentType')">
                <span *ngIf="f['employmentType'].errors?.['required']">Please select your employment type</span>
              </div>
            </div>
          </div>

          <!-- Employer Name -->
          <div class="field">
            <label>Employer / Company name</label>
            <input type="text" formControlName="employerName"
              placeholder="e.g. Tata Consultancy Services, Infosys, Google">
            <div class="field-hint">Optional — helps speed up loan processing</div>
          </div>

          <!-- Terms -->
          <div class="terms-row">
            <input type="checkbox" formControlName="terms" id="terms">
            <label for="terms" style="font-size:0.8rem;color:#374151;cursor:pointer">
              I agree to the <a href="#" style="color:#2563eb">Terms & Conditions</a>
              and <a href="#" style="color:#2563eb">Privacy Policy</a>
            </label>
          </div>
          <div class="error-msg" *ngIf="isInvalid('terms')">
            <span>You must accept the terms and conditions to proceed</span>
          </div>

          <button type="submit" class="btn-primary" [disabled]="loading()">
            {{ loading() ? 'Registering...' : 'Register & Send OTP' }}
          </button>

          <!-- Form summary errors -->
          <div *ngIf="submitted && registerForm.invalid" class="form-error-summary">
            ⚠️ Please fix the errors above before submitting
          </div>
        </form>

        <!-- Step 2: OTP Verification -->
        <div *ngIf="step()===2">
          <div class="otp-hint">
            <div style="font-size:1.5rem;margin-bottom:0.5rem">📱</div>
            OTP sent to <strong>+91 {{ registerForm.get('mobile')?.value }}</strong><br>
            <small style="color:#6b7280">Valid for 5 minutes</small>
            <div style="margin-top:0.75rem;background:#1e293b;color:#7dd3fc;padding:0.5rem 0.75rem;border-radius:0.375rem;font-size:0.72rem;text-align:left">
              Get OTP from terminal:<br>
              docker exec credit-redis redis-cli -a redispass get "OTP:{{ registerForm.get('mobile')?.value }}"
            </div>
          </div>

          <div class="field">
            <label>Enter 6-digit OTP <span class="req">*</span></label>
            <input type="text" [(ngModel)]="otp" [ngModelOptions]="{standalone:true}"
              maxlength="6" placeholder="_ _ _ _ _ _"
              (input)="onOtpInput($event)"
              [class.error-input]="otpError()"
              style="font-size:1.75rem;text-align:center;letter-spacing:0.75rem;font-weight:700">
            <div class="error-msg" *ngIf="otpError()">{{ otpError() }}</div>
            <div class="field-hint">Enter the 6-digit code sent to your mobile</div>
          </div>

          <button (click)="verifyOtp()" class="btn-primary"
            [disabled]="loading() || otp.length < 6">
            {{ loading() ? 'Verifying...' : 'Verify & Continue' }}
          </button>

          <div style="text-align:center;margin-top:1rem">
            <button (click)="step.set(1)" class="btn-secondary">← Change mobile number</button>
          </div>
        </div>

        <p class="footer-link">
          Already have an account? <a routerLink="/login">Sign in here</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .page-bg { min-height:100vh; background:linear-gradient(135deg,#eff6ff,#e0e7ff); display:flex; align-items:center; justify-content:center; padding:1rem; }
    .card { background:white; border-radius:1rem; box-shadow:0 20px 60px rgba(0,0,0,.12); width:100%; max-width:520px; padding:2rem; }
    .logo-wrap { display:flex; flex-direction:column; align-items:center; text-align:center; margin-bottom:1.5rem; }
    .logo { width:52px; height:52px; background:#2563eb; border-radius:12px; display:flex; align-items:center; justify-content:center; color:white; font-size:1.5rem; font-weight:700; margin-bottom:0.75rem; }
    h1 { font-size:1.4rem; font-weight:700; color:#111827; }
    p { color:#6b7280; font-size:0.875rem; margin-top:0.2rem; }
    .steps { display:flex; align-items:center; justify-content:center; margin-bottom:1.5rem; }
    .step { display:flex; align-items:center; gap:0.4rem; font-size:0.8rem; color:#9ca3af; }
    .step.active .step-num,.step.done .step-num { background:#2563eb; color:white; }
    .step.done .step-num { background:#16a34a; }
    .step-num { width:26px; height:26px; border-radius:50%; background:#e5e7eb; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:600; }
    .step-line { flex:1; height:2px; background:#e5e7eb; margin:0 0.75rem; max-width:60px; }
    .row2 { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
    .field { margin-bottom:1rem; }
    label { display:block; font-size:0.825rem; font-weight:600; color:#374151; margin-bottom:0.35rem; }
    .req { color:#ef4444; }
    input[type=text],input[type=email],input[type=password],input[type=tel],input[type=number],select { width:100%; border:1.5px solid #d1d5db; border-radius:0.5rem; padding:0.6rem 0.875rem; font-size:0.875rem; outline:none; transition:border-color 0.15s; box-sizing:border-box; }
    input:focus,select:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.1); }
    .error-input { border-color:#ef4444 !important; background:#fff5f5; }
    .error-input:focus { box-shadow:0 0 0 3px rgba(239,68,68,.1) !important; }
    .error-msg { font-size:0.78rem; color:#dc2626; margin-top:0.3rem; display:flex; align-items:center; gap:0.25rem; }
    .error-msg::before { content:'⚠'; font-size:0.7rem; }
    .field-hint { font-size:0.72rem; color:#9ca3af; margin-top:0.25rem; }
    .input-prefix-wrap { display:flex; }
    .input-prefix { background:#f3f4f6; border:1.5px solid #d1d5db; border-right:none; border-radius:0.5rem 0 0 0.5rem; padding:0.6rem 0.75rem; font-size:0.875rem; color:#6b7280; white-space:nowrap; }
    .input-prefix-wrap input { border-radius:0 0.5rem 0.5rem 0; }
    .input-icon-wrap { position:relative; }
    .input-icon-wrap input { padding-right:2.5rem; }
    .eye-btn { position:absolute; right:0.75rem; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; font-size:1rem; }
    .strength-bar { height:4px; background:#e5e7eb; border-radius:9999px; margin-top:0.5rem; overflow:hidden; }
    .strength-fill { height:100%; border-radius:9999px; transition:width 0.3s,background 0.3s; }
    .terms-row { display:flex; align-items:flex-start; gap:0.5rem; margin-bottom:1rem; }
    .terms-row input[type=checkbox] { margin-top:0.1rem; width:auto; }
    .btn-primary { width:100%; background:#2563eb; color:white; border:none; border-radius:0.5rem; padding:0.75rem; font-size:0.9rem; font-weight:600; cursor:pointer; margin-bottom:0.5rem; }
    .btn-primary:hover { background:#1d4ed8; }
    .btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
    .btn-secondary { background:white; color:#374151; border:1.5px solid #d1d5db; border-radius:0.5rem; padding:0.5rem 1rem; font-size:0.875rem; cursor:pointer; }
    .form-error-summary { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; border-radius:0.5rem; padding:0.75rem; font-size:0.8rem; text-align:center; margin-top:0.5rem; }
    .otp-hint { background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; border-radius:0.5rem; padding:1rem; margin-bottom:1.25rem; text-align:center; font-size:0.875rem; }
    .footer-link { text-align:center; font-size:0.875rem; color:#6b7280; margin-top:1.25rem; }
    .footer-link a { color:#2563eb; font-weight:500; text-decoration:none; }
  `]
})
export class RegisterComponent {
  step        = signal(1);
  otp         = '';
  loading     = signal(false);
  submitted   = false;
  showPassword = false;
  otpError    = signal('');

  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {
    this.registerForm = this.fb.group({
      fullName:       ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100),
                            Validators.pattern(/^[a-zA-Z\s]+$/)]],
      mobile:         ['', [Validators.required, mobileValidator]],
      email:          ['', [Validators.required, Validators.email]],
      password:       ['', [Validators.required, passwordValidator]],
      monthlyIncome:  ['', [Validators.required, Validators.min(10000), Validators.max(10000000)]],
      employmentType: ['', Validators.required],
      employerName:   [''],
      terms:          [false, Validators.requiredTrue]
    });
  }

  get f() { return this.registerForm.controls; }

  isInvalid(field: string): boolean {
    const c = this.f[field];
    return (c.invalid && (c.dirty || c.touched || this.submitted));
  }

  passwordStrength(): number {
    const pwd = this.f['password'].value || '';
    let score = 0;
    if (pwd.length >= 8)          score += 25;
    if (/[A-Z]/.test(pwd))        score += 25;
    if (/[0-9]/.test(pwd))        score += 25;
    if (/[!@#$%^&*]/.test(pwd))   score += 25;
    return score;
  }

  strengthLabel(): string {
    const s = this.passwordStrength();
    if (s <= 25)  return 'Weak';
    if (s <= 50)  return 'Fair';
    if (s <= 75)  return 'Good';
    return 'Strong';
  }

  strengthColor(): string {
    const s = this.passwordStrength();
    if (s <= 25)  return '#ef4444';
    if (s <= 50)  return '#f59e0b';
    if (s <= 75)  return '#3b82f6';
    return '#10b981';
  }

  onOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    // Allow only digits and limit to 6 characters
    this.otp = input.value.replace(/\D/g, '').slice(0, 6);

    // Update the input value
    input.value = this.otp;

    // Clear the error while typing
    if (this.otpError()) {
      this.otpError.set('');
    }
  }

  register() {
    this.submitted = true;
    if (this.registerForm.invalid) {
      this.toast.warning('Please fill all required fields correctly');
      // Mark all fields as touched to show errors
      Object.values(this.f).forEach(c => c.markAsTouched());
      return;
    }

    this.loading.set(true);
    const { terms, ...payload } = this.registerForm.value;

    this.auth.register(payload).subscribe({
      next: (res: any) => {
        this.toast.success(res.message || '✅ OTP sent to your mobile!');
        this.step.set(2);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  verifyOtp() {
    if (this.otp.length !== 6) {
      this.otpError.set('OTP must be exactly 6 digits');
      return;
    }
    if (!/^\d{6}$/.test(this.otp)) {
      this.otpError.set('OTP must contain only numbers');
      return;
    }
    this.otpError.set('');
    this.loading.set(true);

    this.auth.verifyOtp(this.f['mobile'].value, this.otp).subscribe({
      next: () => {
        this.toast.success('🎉 Verified! Welcome to CreditPlatform!');
        setTimeout(() => this.router.navigate(['/dashboard']), 500);
      },
      error: () => this.loading.set(false)
    });
  }

}
