import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { API } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class LoanService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  private get cid() { return this.auth.getCustomerId(); }

  // ── Onboarding ───────────────────────────────────────────
  submitKyc(data: any)    { return this.http.post(`${API.ONBOARDING}/kyc/submit`, data); }
  fetchCreditScore()      { return this.http.post(`${API.ONBOARDING}/credit-score/fetch`, {}); }
  getProfile(id: number)  { return this.http.get(`${API.ONBOARDING}/customers/${id}/profile`); }

  // ── Loans ────────────────────────────────────────────────
  applyForLoan(data: any) {
    return this.http.post<any>(`${API.LOAN}/loans/apply?customerId=${this.cid}`, data);
  }
  getMyApplications() {
    return this.http.get<any[]>(`${API.LOAN}/loans/my-applications?customerId=${this.cid}`);
  }
  getLoan(id: number) {
    return this.http.get<any>(`${API.LOAN}/loans/${id}?customerId=${this.cid}`);
  }
  signAgreement(id: number) {
    return this.http.post<any>(`${API.LOAN}/loans/${id}/sign-agreement?customerId=${this.cid}`, {});
  }
  calculateEmi(p: number, r: number, t: number) {
    return this.http.get<any>(`${API.LOAN}/loans/emi-calculator?principal=${p}&annualRate=${r}&tenureMonths=${t}`);
  }

  // ── Repayment ────────────────────────────────────────────
  getEmiSchedule(loanId: number) {
    return this.http.get<any[]>(`${API.REPAYMENT}/emi/${loanId}/schedule?customerId=${this.cid}`);
  }
  makePayment(data: any) {
    return this.http.post<any>(`${API.REPAYMENT}/repayments/pay?customerId=${this.cid}`, data);
  }
  getLoanSummary(loanId: number) {
    return this.http.get<any>(`${API.REPAYMENT}/repayments/${loanId}/summary?customerId=${this.cid}`);
  }
  getForeclosure(loanId: number) {
    return this.http.get<any>(`${API.REPAYMENT}/repayments/${loanId}/foreclosure`);
  }
}
