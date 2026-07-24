import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

const ONBOARD = 'http://localhost:8081/api/v1';
const LOAN    = 'http://localhost:8082/api/v1';
const REPAY   = 'http://localhost:8084/api/v1';

@Injectable({ providedIn: 'root' })
export class LoanService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  private get cid() { return this.auth.getCustomerId(); }

  // Onboarding
  submitKyc(data: any)     { return this.http.post(`${ONBOARD}/kyc/submit`, data); }
  fetchCreditScore()       { return this.http.post(`${ONBOARD}/credit-score/fetch`, {}); }
  getProfile(id: number)   { return this.http.get(`${ONBOARD}/customers/${id}/profile`); }

  // Loans — pass customerId as query param
  applyForLoan(data: any)  { return this.http.post<any>(`${LOAN}/loans/apply?customerId=${this.cid}`, data); }
  getMyApplications()      { return this.http.get<any[]>(`${LOAN}/loans/my-applications?customerId=${this.cid}`); }
  getLoan(id: number)      { return this.http.get<any>(`${LOAN}/loans/${id}?customerId=${this.cid}`); }
  signAgreement(id: number){ return this.http.post<any>(`${LOAN}/loans/${id}/sign-agreement?customerId=${this.cid}`, {}); }
  calculateEmi(p: number, r: number, t: number) {
    return this.http.get<any>(`${LOAN}/loans/emi-calculator?principal=${p}&annualRate=${r}&tenureMonths=${t}`);
  }

  // Repayment — pass customerId as query param
  getEmiSchedule(loanId: number)  { return this.http.get<any[]>(`${REPAY}/emi/${loanId}/schedule?customerId=${this.cid}`); }
  makePayment(data: any)           { return this.http.post<any>(`${REPAY}/repayments/pay?customerId=${this.cid}`, data); }
  getLoanSummary(loanId: number)   { return this.http.get<any>(`${REPAY}/repayments/${loanId}/summary?customerId=${this.cid}`); }
  getForeclosure(loanId: number)   { return this.http.get<any>(`${REPAY}/repayments/${loanId}/foreclosure`); }
}
